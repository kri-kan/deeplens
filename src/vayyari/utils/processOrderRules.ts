export type ProcessStage = 'unconfirmed' | 'confirmed' | 'placed' | 'delivered' | 'archived';

export const STAGE_RANK: Record<string, number> = {
  unconfirmed: 0,
  unformed: 0,
  confirmed: 1,
  processed: 1,
  processing: 1,
  placed: 2,
  dispatched: 2,
  delivered: 3,
  archived: 4,
};

/** Delivered groups older than this are treated as archived (client-side). */
export const ARCHIVE_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

export const STAGES: { key: ProcessStage; label: string }[] = [
  { key: 'unconfirmed', label: 'Unconfirmed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'placed', label: 'Placed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'archived', label: 'Archived' },
];

export type ProcessStatusIntent = 'attention' | 'positive' | 'critical' | 'info';

export function getStatusIntent(stage: string): ProcessStatusIntent {
  const s = (stage || '').toLowerCase();
  if (s === 'archived') return 'attention';
  if (s === 'delivered') return 'positive';
  if (s === 'placed' || s === 'dispatched') return 'info';
  if (s === 'confirmed' || s === 'processed' || s === 'processing') return 'info';
  if (s === 'unconfirmed' || s === 'unformed') return 'attention';
  return 'attention';
}

export function stageRank(stage?: string): number {
  return STAGE_RANK[(stage || 'unconfirmed').toLowerCase()] ?? 0;
}

/** Derive the least stage from an array of groups belonging to one order. */
export function leastStage(groups: { status?: string }[]): string {
  if (!groups.length) return 'unconfirmed';
  return groups.reduce((least, g) => {
    return stageRank(g.status) < stageRank(least) ? (g.status || 'unconfirmed') : least;
  }, groups[0].status || 'unconfirmed');
}

/**
 * Map a raw DB status (+ optional updatedAt) to one of the 5 tab keys.
 * Delivered groups older than ARCHIVE_THRESHOLD_MS are treated as 'archived'.
 */
export function statusToTab(
  status: string,
  updatedAt?: string,
  createdAt?: string,
  nowMs: number = Date.now()
): ProcessStage {
  const s = (status || '').toLowerCase();
  if (s === 'delivered' || s === 'archived') {
    const deliveredAt = updatedAt || createdAt;
    if (deliveredAt) {
      const age = nowMs - new Date(deliveredAt).getTime();
      if (age >= ARCHIVE_THRESHOLD_MS) return 'archived';
    }
    return 'delivered';
  }
  if (s === 'placed' || s === 'dispatched') return 'placed';
  if (s === 'confirmed' || s === 'processed' || s === 'processing') return 'confirmed';
  return 'unconfirmed';
}
