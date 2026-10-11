import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  ORDER_STAGES,
  STAGE_COLORS,
  getStageColor,
  isAdjacentStage,
  canTransitionStage,
  synthesizeProgressionHistory,
  resolveInitials,
} from '../utils/stageTransitionRules';

describe('Stage Transition and Sequential Workflow Rules', () => {
  test('ORDER_STAGES sequence is ordered sequentially', () => {
    assert.deepStrictEqual(ORDER_STAGES, [
      'Unconfirmed',
      'Confirmed',
      'Placed',
      'Delivered',
    ]);
  });

  test('getStageColor returns exact expected hex codes', () => {
    assert.strictEqual(getStageColor('Unconfirmed'), '#94A3B8');
    assert.strictEqual(getStageColor('unconfirmed'), '#94A3B8');
    assert.strictEqual(getStageColor('Confirmed'), '#F59E0B');
    assert.strictEqual(getStageColor('Placed'), '#2563EB');
    assert.strictEqual(getStageColor('Delivered'), '#10B981');
    assert.strictEqual(getStageColor('Unknown'), '#64748B');
  });

  test('isAdjacentStage allows only index delta of ±1', () => {
    assert.strictEqual(isAdjacentStage('Unconfirmed', 'Confirmed'), true);
    assert.strictEqual(isAdjacentStage('Confirmed', 'Unconfirmed'), true);
    assert.strictEqual(isAdjacentStage('Confirmed', 'Placed'), true);
    assert.strictEqual(isAdjacentStage('Placed', 'Confirmed'), true);
    assert.strictEqual(isAdjacentStage('Placed', 'Delivered'), true);
    assert.strictEqual(isAdjacentStage('Delivered', 'Placed'), true);

    // Skips / non-adjacent
    assert.strictEqual(isAdjacentStage('Unconfirmed', 'Placed'), false);
    assert.strictEqual(isAdjacentStage('Unconfirmed', 'Delivered'), false);
    assert.strictEqual(isAdjacentStage('Confirmed', 'Delivered'), false);
  });

  test('canTransitionStage enforces sequential and label gates', () => {
    // Same stage
    const same = canTransitionStage({
      currentStage: 'Confirmed',
      targetStage: 'Confirmed',
    });
    assert.strictEqual(same.allowed, false);
    assert.strictEqual(same.reason, 'SAME_STAGE');

    // Non adjacent
    const skip = canTransitionStage({
      currentStage: 'Unconfirmed',
      targetStage: 'Placed',
    });
    assert.strictEqual(skip.allowed, false);
    assert.strictEqual(skip.reason, 'NON_ADJACENT');

    // Placed requiring label without label
    const labelMissing = canTransitionStage({
      currentStage: 'Confirmed',
      targetStage: 'Placed',
      requiresLabel: true,
      hasLabel: false,
    });
    assert.strictEqual(labelMissing.allowed, false);
    assert.strictEqual(labelMissing.reason, 'LABEL_REQUIRED');

    // Placed with label present
    const labelOk = canTransitionStage({
      currentStage: 'Confirmed',
      targetStage: 'Placed',
      requiresLabel: true,
      hasLabel: true,
    });
    assert.strictEqual(labelOk.allowed, true);

    // Normal advance
    const normal = canTransitionStage({
      currentStage: 'Unconfirmed',
      targetStage: 'Confirmed',
    });
    assert.strictEqual(normal.allowed, true);
  });

  test('synthesizeProgressionHistory builds progressive timeline', () => {
    const unconfirmed = synthesizeProgressionHistory('Unconfirmed');
    assert.strictEqual(unconfirmed.nodes.length, 1);
    assert.strictEqual(unconfirmed.nodes[0], 'Unconfirmed');
    assert.strictEqual(unconfirmed.transitions.length, 0);

    const placed = synthesizeProgressionHistory('Placed');
    assert.deepStrictEqual(placed.nodes, [
      'Unconfirmed',
      'Confirmed',
      'Placed',
    ]);
    assert.strictEqual(placed.transitions.length, 2);
    assert.strictEqual(placed.transitions[0].action, 'Confirmed');
    assert.strictEqual(placed.transitions[1].action, 'Label Ready');
    assert.strictEqual(placed.transitions[1].actorInitials, 'SK');
  });

  test('resolveInitials resolves initials from full name and email', () => {
    assert.strictEqual(resolveInitials('sai krishna kanth'), 'SK');
    assert.strictEqual(resolveInitials('sai@krishnakanthoutlook.onmicrosoft.com'), 'SA');
    assert.strictEqual(resolveInitials('sai.krishna@outlook.com'), 'SK');
    assert.strictEqual(resolveInitials(undefined), 'SK');
  });
});
