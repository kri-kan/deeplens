import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  applyOptimisticStar,
  computeNextStarredState,
  recordSessionStarToggle,
  revertOptimisticStar,
  StarUpdateTarget,
} from '../utils/catalogStarRules';

describe('Product Catalog Star Mutation & State Transitions', () => {
  const sampleProducts: StarUpdateTarget[] = [
    {
      id: 'prod-001',
      isStarred: false,
      IsStarred: false,
    },
    {
      id: 'prod-002',
      isStarred: true,
      IsStarred: true,
    },
  ];

  it('computes correct next starred state when toggling without explicit value', () => {
    // Unstarred -> true
    const next1 = computeNextStarredState(sampleProducts[0]);
    assert.strictEqual(next1, true);

    // Starred -> false
    const next2 = computeNextStarredState(sampleProducts[1]);
    assert.strictEqual(next2, false);

    // Explicit override respected
    const next3 = computeNextStarredState(sampleProducts[0], false);
    assert.strictEqual(next3, false);
    const next4 = computeNextStarredState(sampleProducts[1], true);
    assert.strictEqual(next4, true);
  });

  it('optimistically updates isStarred to true on star toggle', () => {
    const updated = applyOptimisticStar(sampleProducts, 'prod-001', true);
    const target = updated.find((p) => p.id === 'prod-001');

    assert.strictEqual(target?.isStarred, true);
    assert.strictEqual(target?.IsStarred, true);

    // Unrelated products remain untouched
    const other = updated.find((p) => p.id === 'prod-002');
    assert.strictEqual(other?.isStarred, true);
  });

  it('reverts optimistic star update when backend API rejects with error', () => {
    // 1. Optimistic update
    const optimistic = applyOptimisticStar(sampleProducts, 'prod-001', true);
    assert.strictEqual(optimistic.find((p) => p.id === 'prod-001')?.isStarred, true);

    // 2. Simulated mutation rejection (e.g. 404 or network error) -> Revert
    const reverted = revertOptimisticStar(optimistic, 'prod-001', true);
    const target = reverted.find((p) => p.id === 'prod-001');

    assert.strictEqual(target?.isStarred, false);
    assert.strictEqual(target?.IsStarred, false);
  });

  it('optimistically unstars a currently starred product and reverts on error', () => {
    // 1. Optimistic unstar
    const optimistic = applyOptimisticStar(sampleProducts, 'prod-002', false);
    assert.strictEqual(optimistic.find((p) => p.id === 'prod-002')?.isStarred, false);

    // 2. Revert back to starred on failure
    const reverted = revertOptimisticStar(optimistic, 'prod-002', false);
    assert.strictEqual(reverted.find((p) => p.id === 'prod-002')?.isStarred, true);
  });

  it('records session-toggled star IDs to prevent abrupt tile pruning in filtered views', () => {
    let sessionIds: string[] = [];
    assert.deepStrictEqual(sessionIds, []);

    sessionIds = recordSessionStarToggle(sessionIds, 'prod-001');
    assert.deepStrictEqual(sessionIds, ['prod-001']);

    // Duplicate toggle of same id does not create duplicates
    sessionIds = recordSessionStarToggle(sessionIds, 'prod-001');
    assert.deepStrictEqual(sessionIds, ['prod-001']);

    // Adding another id
    sessionIds = recordSessionStarToggle(sessionIds, 'prod-002');
    assert.deepStrictEqual(sessionIds, ['prod-001', 'prod-002']);
  });
});
