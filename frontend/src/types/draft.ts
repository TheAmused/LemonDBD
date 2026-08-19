// frontend/src/types/draft.ts
export type DraftPhase = 'bans' | 'picks' | 'complete';

export interface DraftRoom {
  id?: number;
  room_code: string;
  phase: DraftPhase;
  banned_perks: string[];
  picked_survivor_perks: string[];
  picked_killer_perks: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DraftActionPayload {
  action?: 'ban' | 'pick';
  action_type?: 'ban' | 'pick';
  perk_name?: string;
  perk?: string;
  role?: 'survivor' | 'killer';
  target_role?: 'survivor' | 'killer';
  phase?: DraftPhase;
}
