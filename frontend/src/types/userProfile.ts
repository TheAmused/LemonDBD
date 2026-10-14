// frontend/src/types/userProfile.ts
export interface UserBugReport {
  id: number;
  title: string;
  message: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_notes?: string;
  /** True while a developer reply the reporter has not opened yet is waiting. */
  feedback_unread?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StatusFeedback {
  type: 'success' | 'error';
  text: string;
}

