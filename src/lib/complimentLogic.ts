export interface DrawSelectionResult<T extends { id: string }> {
  selected: T | null;
  cycleReset: boolean;
  nextCycleNumber: number;
  remainingInCycleAfterDraw: number;
}

/**
 * Pure non-repeating compliment draw algorithm.
 * - Filters out soft-deleted compliments (`isDeleted`).
 * - Draws uniformly from compliments not yet seen in the current `cycleNumber`.
 * - When every available compliment has been drawn in the current cycle, advances `cycleNumber + 1`
 *   and avoids immediate back-to-back repeat (`lastDrawnId`) whenever more than 1 compliment exists.
 */
export function selectNextCompliment<T extends { id: string; isDeleted?: boolean }>(
  allComplimentsForRecipient: readonly T[],
  currentCycleDraws: ReadonlyArray<{ complimentId: string; cycleNumber: number }>,
  randomFn: () => number = Math.random,
  lastDrawnId?: string | null,
): DrawSelectionResult<T> {
  const active = allComplimentsForRecipient.filter((c) => !c.isDeleted);
  if (active.length === 0) {
    return {
      selected: null,
      cycleReset: false,
      nextCycleNumber: 1,
      remainingInCycleAfterDraw: 0,
    };
  }

  const maxCycle = currentCycleDraws.reduce(
    (max, d) => (d.cycleNumber > max ? d.cycleNumber : max),
    1,
  );
  const drawnIdsInCurrentCycle = new Set(
    currentCycleDraws.filter((d) => d.cycleNumber === maxCycle).map((d) => d.complimentId),
  );

  let pool = active.filter((c) => !drawnIdsInCurrentCycle.has(c.id));
  let cycleReset = false;
  let nextCycleNumber = maxCycle;

  if (pool.length === 0) {
    cycleReset = currentCycleDraws.length > 0;
    nextCycleNumber = currentCycleDraws.length > 0 ? maxCycle + 1 : 1;
    pool =
      active.length > 1 && lastDrawnId
        ? active.filter((c) => c.id !== lastDrawnId)
        : [...active];
  }

  const rawIndex = Math.floor(Math.max(0, Math.min(0.999999999, randomFn())) * pool.length);
  const selected = pool[rawIndex] ?? pool[0];
  const remainingInCycleAfterDraw = cycleReset
    ? Math.max(0, active.length - 1)
    : Math.max(0, pool.length - 1);

  return {
    selected,
    cycleReset,
    nextCycleNumber,
    remainingInCycleAfterDraw,
  };
}
