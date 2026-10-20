// frontend/src/components/streaks/runRequestTracker.ts

export type RequestChannel = 'run' | 'stats' | 'completions';

/**
 * The bookkeeping behind `useChallengeRun`, free of React so its rules can be tested on their own: which answers
 * are still worth showing, and which run already has a server action in flight.
 */
export function createRunRequestTracker(currentScope: () => string) {
  const counts: Record<RequestChannel, number> = { run: 0, stats: 0, completions: 0 };
  const actionsInFlight = new Set<string>();

  return {
    /** Starts a request. The returned check says whether its answer is still worth showing: no newer request on
     *  the channel has started, and the player is still on the run it was made for. */
    begin(channel: RequestChannel, scope: string): () => boolean {
      const id = ++counts[channel];
      return () => counts[channel] === id && currentScope() === scope;
    },

    /** A server action answered with the newest state of `scope`'s run. Loads that started before it are now
     *  outdated. False, and nothing changes, when the player already moved to another run: the answer belongs to
     *  the old run and must not invalidate the loads of the new one. */
    acceptRunAnswer(scope: string): boolean {
      if (currentScope() !== scope) return false;
      counts.run += 1;
      return true;
    },

    /** Marks an action on `scope`'s run as started; false when one is already running there. Other runs are not blocked. */
    startAction(scope: string): boolean {
      if (actionsInFlight.has(scope)) return false;
      actionsInFlight.add(scope);
      return true;
    },

    finishAction(scope: string): void {
      actionsInFlight.delete(scope);
    },
  };
}
