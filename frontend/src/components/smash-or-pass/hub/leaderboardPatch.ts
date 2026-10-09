// frontend/src/components/smash-or-pass/hub/leaderboardPatch.ts
import type { EntityItem, LeaderboardItem, VoteResponse } from '@/types/smashOrPass';

/**
 * Folds the tallies a vote came back with into the leaderboard row for that character, so the
 * Hall of Fame shows the new counts before the full leaderboard refetch lands.
 */
export function applyVoteToLeaderboard(
  items: LeaderboardItem[],
  character: EntityItem,
  entityData: VoteResponse['data']
): LeaderboardItem[] {
  return items.map((item) => {
    const slug = item.slug || item.character_slug;
    if (slug !== character.slug && item.id !== character.id) return item;

    const sCount = entityData.smash_count ?? item.smash_count ?? 0;
    const pCount = entityData.pass_count ?? item.pass_count ?? 0;
    const ssCount = entityData.super_smash_count ?? item.super_smash_count ?? 0;
    const tVotes = entityData.total_votes ?? item.total_votes ?? sCount + pCount + ssCount;
    const sRate = entityData.smash_rate ?? item.smash_rate ?? 0;
    const tallies = {
      smash_count: sCount,
      pass_count: pCount,
      super_smash_count: ssCount,
      total_votes: tVotes,
      smash_rate: sRate,
    };

    return {
      ...item,
      ...tallies,
      stat: item.stat ? { ...item.stat, ...tallies } : null,
    };
  });
}
