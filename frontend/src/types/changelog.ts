// frontend/src/types/changelog.ts

/** Ready-made sections the editor can insert (heading plus an empty bullet list). */
export type ChangelogSection = 'new' | 'qol' | 'balance' | 'bugfix' | 'knownIssues' | 'announcement';

export interface ChangelogPost {
  id: number;
  title: string;
  content_html: string;
  is_published: boolean;
  position: number;
  created_at: string | null;
  /** When the entry went live: the date readers see. Null while it is a draft. */
  published_at: string | null;
  /** When the title or text of the live entry last changed; readers see an "Edited" note. */
  edited_at: string | null;
  /** Set once the entry was posted to Discord; an entry is announced only once. */
  discord_announced_at: string | null;
  /** When the Discord message last matched the entry. Null if it cannot be updated (no message id kept). */
  discord_synced_at: string | null;
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
  is_published: boolean;
}

/** "missing": the Discord message was deleted there, so the entry can be announced again. */
export type ChangelogDiscordResult = 'sent' | 'failed' | 'not_configured' | 'missing';

export interface ChangelogSaveResponse {
  status: string;
  data: ChangelogPost;
  /** After an edit: how rewriting the entry's Discord message went. Null when there was nothing to update. */
  discord?: ChangelogDiscordResult | null;
}

export interface ChangelogAnnounceResponse extends ChangelogSaveResponse {
  /** Only "sent" marks the entry as announced; a failure can be retried. */
  discord: ChangelogDiscordResult;
}
