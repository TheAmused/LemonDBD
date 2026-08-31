// frontend/src/services/changelogApi.ts
import { getBackendBaseUrl } from '@/utils/perkUtils';
import type { ChangelogListResponse, ChangelogPost, ChangelogPostDraft } from '@/types/changelog';

const API_BASE = () => `${getBackendBaseUrl()}/api/v1/changelog`;

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Request failed with status ${res.status}`);
  }
  return body;
}

export async function fetchChangelogPosts(page = 1, perPage = 20): Promise<ChangelogListResponse> {
  const res = await fetch(`${API_BASE()}?page=${page}&per_page=${perPage}`, { cache: 'no-store' });
  return parseOrThrow(res);
}

export async function fetchChangelogPostsAdmin(
  token: string,
  page = 1,
  perPage = 50
): Promise<ChangelogListResponse> {
  const res = await fetch(`${API_BASE()}/admin?page=${page}&per_page=${perPage}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow(res);
}

export async function createChangelogPost(
  token: string,
  draft: ChangelogPostDraft
): Promise<{ status: string; data: ChangelogPost }> {
  const res = await fetch(`${API_BASE()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(draft),
  });
  return parseOrThrow(res);
}

export async function updateChangelogPost(
  token: string,
  id: number,
  draft: Partial<ChangelogPostDraft>
): Promise<{ status: string; data: ChangelogPost }> {
  const res = await fetch(`${API_BASE()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(draft),
  });
  return parseOrThrow(res);
}

export async function deleteChangelogPost(token: string, id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE()}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow(res);
}

export async function reorderChangelogPosts(
  token: string,
  orderedIds: number[]
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE()}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
  return parseOrThrow(res);
}
