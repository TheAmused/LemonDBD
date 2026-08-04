import { Quest } from '../types/quest';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/quests`;

const DEFAULT_LOCAL_QUESTS: Quest[] = [
  {
    id: 1,
    title: 'Escape 2 Trials',
    description: 'Escape successfully as a survivor 2 times.',
    category: 'daily',
    progress: 2,
    goal: 2,
    xp_reward: 500,
    is_completed: false,
  },
  {
    id: 2,
    title: 'Sacrifice 3 Survivors',
    description: 'Hook and sacrifice 3 survivors as killer.',
    category: 'daily',
    progress: 1,
    goal: 3,
    xp_reward: 500,
    is_completed: false,
  },
  {
    id: 3,
    title: 'Complete 5 Generator Skill Checks',
    description: 'Succeed at 5 skill checks while repairing.',
    category: 'daily',
    progress: 5,
    goal: 5,
    xp_reward: 500,
    is_completed: false,
  },
  {
    id: 4,
    title: 'Master of the Realm',
    description: 'Win 10 matches in any role.',
    category: 'weekly',
    progress: 10,
    goal: 10,
    xp_reward: 2500,
    is_completed: false,
  },
];

let localQuestsMemory = [...DEFAULT_LOCAL_QUESTS];

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchQuests(): Promise<{ status: string; quests: Quest[] }> {
  try {
    const response = await fetch(`${API_BASE}/`);
    return await handleResponse<{ status: string; quests: Quest[] }>(response);
  } catch (err) {
    console.warn('Backend quests API unavailable, returning local seed quests:', err);
    return { status: 'success', quests: [...localQuestsMemory] };
  }
}

export async function claimQuest(
  questId: number
): Promise<{ status: string; quest: Quest; xp_reward: number }> {
  try {
    const response = await fetch(`${API_BASE}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quest_id: questId }),
    });
    return await handleResponse<{ status: string; quest: Quest; xp_reward: number }>(response);
  } catch (err) {
    console.warn('Backend quests API claim failed, processing locally:', err);
    const quest = localQuestsMemory.find((q) => q.id === questId);
    if (!quest) {
      throw new Error(`Quest with ID ${questId} not found.`);
    }
    quest.is_completed = true;
    quest.progress = quest.goal;
    return {
      status: 'success',
      quest: { ...quest },
      xp_reward: quest.xp_reward,
    };
  }
}
