// frontend/src/services/draftApi.ts
import { DraftRoom, DraftActionPayload } from '../types/draft';
import { getBackendBaseUrl } from '@/utils/api';

const API_BASE = `${getBackendBaseUrl()}/api/v1/draft`;

// In-memory fallback state for client-side offline mode
const memoryRooms: Record<string, DraftRoom> = {};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function createDraftRoom(roomCode?: string): Promise<{ status: string; room: DraftRoom }> {
  try {
    const response = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomCode ? { room_code: roomCode } : {}),
    });
    return await handleResponse<{ status: string; room: DraftRoom }>(response);
  } catch (err) {
    console.warn('Backend draft API unavailable, using local memory draft room session:', err);
    const code = (roomCode || Math.random().toString(36).substring(2, 8)).toUpperCase();
    const newRoom: DraftRoom = {
      room_code: code,
      phase: 'bans',
      banned_perks: [],
      picked_survivor_perks: [],
      picked_killer_perks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryRooms[code] = newRoom;
    return { status: 'success', room: newRoom };
  }
}

export async function getDraftRoom(roomCode: string): Promise<{ status: string; room: DraftRoom }> {
  try {
    const response = await fetch(`${API_BASE}/${roomCode}`);
    return await handleResponse<{ status: string; room: DraftRoom }>(response);
  } catch (err) {
    console.warn('Backend draft API unavailable, checking local memory session:', err);
    const room = memoryRooms[roomCode.toUpperCase()];
    if (room) {
      return { status: 'success', room };
    }
    throw new Error(`Draft room '${roomCode}' not found.`);
  }
}

export async function processDraftAction(
  roomCode: string,
  payload: DraftActionPayload
): Promise<{ status: string; room: DraftRoom }> {
  try {
    const response = await fetch(`${API_BASE}/${roomCode}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse<{ status: string; room: DraftRoom }>(response);
  } catch (err) {
    console.warn('Backend draft API unavailable, processing action locally:', err);
    const code = roomCode.toUpperCase();
    let room = memoryRooms[code];
    if (!room) {
      room = {
        room_code: code,
        phase: 'bans',
        banned_perks: [],
        picked_survivor_perks: [],
        picked_killer_perks: [],
      };
      memoryRooms[code] = room;
    }

    const actionType = payload.action || payload.action_type;
    const perkName = payload.perk_name || payload.perk;
    const role = (payload.role || payload.target_role || 'survivor').toLowerCase();

    if (actionType === 'ban' && perkName && !room.banned_perks.includes(perkName)) {
      room.banned_perks.push(perkName);
    } else if (actionType === 'pick' && perkName) {
      if (role === 'killer') {
        if (!room.picked_killer_perks.includes(perkName)) {
          room.picked_killer_perks.push(perkName);
        }
      } else {
        if (!room.picked_survivor_perks.includes(perkName)) {
          room.picked_survivor_perks.push(perkName);
        }
      }
    }

    if (payload.phase) {
      room.phase = payload.phase;
    }

    room.updated_at = new Date().toISOString();
    return { status: 'success', room: { ...room } };
  }
}
