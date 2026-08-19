// frontend/src/types/admin.ts
export interface AdminStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  total_characters: number;
  survivors_count: number;
  killers_count: number;
  total_perks: number;
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  owned_characters_count: number;
  unlocked_perks_count: number;
}

export interface AdminBugReport {
  id: number;
  user_id?: number;
  reporter_name: string;
  reporter_email?: string;
  title: string;
  category: string;
  message: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface BugReportStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

export interface ActionMessage {
  type: 'success' | 'error';
  text: string;
}

