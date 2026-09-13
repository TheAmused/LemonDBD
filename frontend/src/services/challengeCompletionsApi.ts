// frontend/src/services/challengeCompletionsApi.ts
import { ChallengeCompletionStatus } from '../types/challengeCompletionStatus';
import { createStreakApiClient } from './streakApiClient';

const { getJson } = createStreakApiClient('challenge-completions');

export async function fetchCompletionStatus(token: string): Promise<ChallengeCompletionStatus> {
  return getJson<ChallengeCompletionStatus>(token, '/status');
}
