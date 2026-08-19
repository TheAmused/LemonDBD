// frontend/src/types/quest.ts
export interface Quest {
  id: number;
  title: string;
  description: string;
  category: 'daily' | 'weekly';
  progress: number;
  goal: number;
  xp_reward: number;
  is_completed: boolean;
  created_at?: string;
}
