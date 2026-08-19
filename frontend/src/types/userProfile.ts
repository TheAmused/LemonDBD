// frontend/src/types/userProfile.ts
export interface UserBugReport {
  id: number;
  title: string;
  category: string;
  message: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StatusFeedback {
  type: 'success' | 'error';
  text: string;
}

