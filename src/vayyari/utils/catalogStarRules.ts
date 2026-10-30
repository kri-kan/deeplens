export interface StarUpdateTarget {
  id: string;
  isStarred?: boolean;
  IsStarred?: boolean;
}

/**
 * Computes the next starred state when toggling.
 * If nextStarred is explicitly passed, use it. Otherwise, negate the current isStarred / IsStarred.
 */
export function computeNextStarredState(
  current: StarUpdateTarget | undefined,
  explicitNext?: boolean
): boolean {
  if (explicitNext !== undefined) {
    return explicitNext;
  }
  const currentVal = Boolean(current?.isStarred ?? current?.IsStarred);
  return !currentVal;
}

/**
 * Optimistically updates the star status on a product collection.
 */
export function applyOptimisticStar<T extends StarUpdateTarget>(
  products: T[],
  productId: string,
  targetStarred: boolean
): T[] {
  return products.map((p) => {
    if (p.id === productId) {
      return {
        ...p,
        isStarred: targetStarred,
        IsStarred: targetStarred,
      };
    }
    return p;
  });
}

/**
 * Reverts the optimistic star update when an API error occurs.
 */
export function revertOptimisticStar<T extends StarUpdateTarget>(
  products: T[],
  productId: string,
  targetStarred: boolean
): T[] {
  return products.map((p) => {
    if (p.id === productId) {
      return {
        ...p,
        isStarred: !targetStarred,
        IsStarred: !targetStarred,
      };
    }
    return p;
  });
}

/**
 * Manages session-toggled star IDs to avoid abrupt tile pruning in filtered views.
 */
export function recordSessionStarToggle(sessionIds: string[], productId: string): string[] {
  if (sessionIds.includes(productId)) {
    return sessionIds;
  }
  return [...sessionIds, productId];
}
