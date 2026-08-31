// frontend/src/types/changelog.ts

export type ChangelogTag = 'feature' | 'bugfix' | 'balance' | 'event' | 'announcement';

export interface ChangelogPost {
  id: number;
  title: string;
  content_html: string;
  tag: ChangelogTag;
  is_published: boolean;
  position: number;
  author_name: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChangelogListResponse {
  status: string;
  data: ChangelogPost[];
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
}

export interface ChangelogPostDraft {
  title: string;
  content_html: string;
  tag: ChangelogTag;
  is_published: boolean;
}
