export const ORDER_STAGES = [
  'Unconfirmed',
  'Confirmed',
  'Processed',
  'Placed',
  'Delivered',
] as const;

export type OrderStage = typeof ORDER_STAGES[number];

export const STAGE_COLORS: Record<string, string> = {
  unconfirmed: '#94A3B8',
  confirmed: '#F59E0B',
  processed: '#6366F1',
  placed: '#2563EB',
  delivered: '#10B981',
};

export const getStageColor = (stage: string): string => {
  return STAGE_COLORS[(stage || '').toLowerCase()] || '#64748B';
};

export interface StateTransitionRecord {
  fromStage?: string;
  toStage: string;
  action?: string;
  actorName?: string;
  actorInitials?: string;
  timestamp?: string;
  comment?: string;
}

export function resolveInitials(name?: string, fallback = 'SK'): string {
  if (!name) return fallback;
  if (name.includes('@')) {
    const userPart = name.split('@')[0];
    const parts = userPart.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userPart.slice(0, 2).toUpperCase();
  }
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return fallback;
}

export const DEFAULT_STAGE_ACTIONS: Record<string, string> = {
  confirmed: 'Confirmed',
  processed: 'Processed',
  placed: 'Label Ready',
  delivered: 'Delivered',
};

export function isAdjacentStage(
  currentStage: string,
  targetStage: string,
  stages: readonly string[] = ORDER_STAGES
): boolean {
  const currentIdx = stages.findIndex(
    (s) => s.toLowerCase() === (currentStage || '').toLowerCase()
  );
  const targetIdx = stages.findIndex(
    (s) => s.toLowerCase() === (targetStage || '').toLowerCase()
  );
  if (currentIdx === -1 || targetIdx === -1) return false;
  return Math.abs(targetIdx - currentIdx) === 1;
}

export function canTransitionStage({
  currentStage,
  targetStage,
  requiresLabel = false,
  hasLabel = false,
  stages = ORDER_STAGES,
}: {
  currentStage: string;
  targetStage: string;
  requiresLabel?: boolean;
  hasLabel?: boolean;
  stages?: readonly string[];
}): { allowed: boolean; reason?: 'SAME_STAGE' | 'NON_ADJACENT' | 'LABEL_REQUIRED' } {
  const currentIdx = stages.findIndex(
    (s) => s.toLowerCase() === (currentStage || '').toLowerCase()
  );
  const targetIdx = stages.findIndex(
    (s) => s.toLowerCase() === (targetStage || '').toLowerCase()
  );

  if (targetIdx === currentIdx) {
    return { allowed: false, reason: 'SAME_STAGE' };
  }

  if (Math.abs(targetIdx - currentIdx) !== 1) {
    return { allowed: false, reason: 'NON_ADJACENT' };
  }

  if (targetStage.toLowerCase() === 'placed' && requiresLabel && !hasLabel) {
    return { allowed: false, reason: 'LABEL_REQUIRED' };
  }

  return { allowed: true };
}

export function synthesizeProgressionHistory(
  currentStage: string,
  stages: readonly string[] = ORDER_STAGES
): { nodes: string[]; transitions: StateTransitionRecord[] } {
  const safeCurrent = currentStage || stages[0];
  const targetIdx = stages.findIndex(
    (s) => s.toLowerCase() === safeCurrent.toLowerCase()
  );
  const validIdx = targetIdx >= 0 ? targetIdx : 0;

  const nodes: string[] = [stages[0]];
  const transitions: StateTransitionRecord[] = [];

  for (let i = 1; i <= validIdx; i++) {
    const fromSt = stages[i - 1];
    const toSt = stages[i];
    transitions.push({
      fromStage: fromSt,
      toStage: toSt,
      action: DEFAULT_STAGE_ACTIONS[toSt.toLowerCase()] || toSt,
      actorName: 'sai krishna kanth',
      actorInitials: 'SK',
      timestamp: i === validIdx ? 'Just now' : 'Today',
    });
    nodes.push(toSt);
  }

  return { nodes, transitions };
}
