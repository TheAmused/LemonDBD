// frontend/src/types/userProfile.ts
export interface UserBugReport {
  id: number;
  title: string;
  message: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_notes?: string;
  feedback_unread?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StatusFeedback {
  type: 'success' | 'error';
  text: string;
}

