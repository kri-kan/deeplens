import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Candidate resolution logic modeled from product-similar-matches.tsx
 */
function resolveMatch(candidate: any, focalProductId: string) {
  const score: number = candidate.similarityScore ?? 0;
  const scorePercent = Math.round(score * 100);

  const isAFocal = candidate.productAId === focalProductId;

  const otherId       = isAFocal ? candidate.productBId       : candidate.productAId;
  const otherTitle    = isAFocal ? candidate.productBTitle    : candidate.productATitle;
  const otherSku      = isAFocal ? candidate.productBSku      : candidate.productASku;
  const otherMediaId  = isAFocal ? candidate.productBMediaId  : candidate.productAMediaId;
  const otherPath     = isAFocal ? candidate.productBImagePath: candidate.productAImagePath;
  const otherCreated  = isAFocal ? candidate.productBCreatedAt: candidate.productACreatedAt;
  const otherIsDeleted = isAFocal ? Boolean(candidate.productBIsDeleted) : Boolean(candidate.productAIsDeleted);
  const otherIsArchived = isAFocal ? Boolean(candidate.productBIsArchived) : Boolean(candidate.productAIsArchived);
  const isInactive    = otherIsDeleted || otherIsArchived;

  const focalCreated  = isAFocal ? candidate.productACreatedAt : candidate.productBCreatedAt;

  return {
    candidateId: candidate.id,
    score,
    scorePercent,
    status: candidate.status ?? 'pending',
    otherId,
    otherTitle,
    otherSku,
    otherThumb: otherMediaId ? `https://media.local/${otherMediaId}` : `https://media.local/${otherPath}`,
    otherIsDeleted,
    otherIsArchived,
    isInactive,
    focalIsTarget: new Date(focalCreated) <= new Date(otherCreated),
  };
}

describe('Product Similar Matches - Inactive Suggestions & Merge Guard Rules', () => {
  const focalProductId = 'prod-focal-123';

  test('resolves candidate where focal is Product A and Product B is archived', () => {
    const candidate = {
      id: 'cand-1',
      productAId: focalProductId,
      productATitle: 'Kanchi Pattu Saree',
      productASku: 'VF1FC33',
      productACreatedAt: '2026-01-01T10:00:00Z',
      productAIsDeleted: false,
      productAIsArchived: false,
      productBId: 'prod-archived-456',
      productBTitle: 'Old Kanchipuram Silk',
      productBSku: 'VF1B6B',
      productBCreatedAt: '2025-11-01T10:00:00Z',
      productBIsDeleted: false,
      productBIsArchived: true,
      similarityScore: 0.94,
      status: 'pending',
    };

    const match = resolveMatch(candidate, focalProductId);

    assert.equal(match.otherId, 'prod-archived-456');
    assert.equal(match.otherSku, 'VF1B6B');
    assert.equal(match.otherIsArchived, true);
    assert.equal(match.otherIsDeleted, false);
    assert.equal(match.isInactive, true);
    assert.equal(match.scorePercent, 94);
  });

  test('resolves candidate where focal is Product B and Product A is soft-deleted', () => {
    const candidate = {
      id: 'cand-2',
      productAId: 'prod-deleted-789',
      productATitle: 'Deleted Georgette Kurti',
      productASku: 'VF-DEL-01',
      productACreatedAt: '2025-06-01T10:00:00Z',
      productAIsDeleted: true,
      productAIsArchived: false,
      productBId: focalProductId,
      productBTitle: 'Active Kurti',
      productBSku: 'VF1FC33',
      productBCreatedAt: '2026-01-01T10:00:00Z',
      productBIsDeleted: false,
      productBIsArchived: false,
      similarityScore: 0.88,
      status: 'pending',
    };

    const match = resolveMatch(candidate, focalProductId);

    assert.equal(match.otherId, 'prod-deleted-789');
    assert.equal(match.otherSku, 'VF-DEL-01');
    assert.equal(match.otherIsDeleted, true);
    assert.equal(match.otherIsArchived, false);
    assert.equal(match.isInactive, true);
    assert.equal(match.scorePercent, 88);
  });

  test('resolves active candidate where neither product is deleted nor archived', () => {
    const candidate = {
      id: 'cand-3',
      productAId: focalProductId,
      productATitle: 'Active Saree',
      productASku: 'VF1FC33',
      productACreatedAt: '2026-01-01T10:00:00Z',
      productAIsDeleted: false,
      productAIsArchived: false,
      productBId: 'prod-active-999',
      productBTitle: 'Another Active Saree',
      productBSku: 'VF1FC99',
      productBCreatedAt: '2026-01-02T10:00:00Z',
      productBIsDeleted: false,
      productBIsArchived: false,
      similarityScore: 0.91,
      status: 'pending',
    };

    const match = resolveMatch(candidate, focalProductId);

    assert.equal(match.otherId, 'prod-active-999');
    assert.equal(match.otherIsDeleted, false);
    assert.equal(match.otherIsArchived, false);
    assert.equal(match.isInactive, false);
  });

  test('selection toggle rule: blocks selection of inactive products and returns snackbar message', () => {
    const selectedIds = new Set<string>();
    let snackMessage: string | null = null;

    const toggleSelect = (match: ReturnType<typeof resolveMatch>) => {
      if (match.isInactive) {
        snackMessage = match.otherIsDeleted
          ? 'Cannot merge with soft-deleted product'
          : 'Cannot merge with archived product';
        return;
      }
      if (selectedIds.has(match.candidateId)) {
        selectedIds.delete(match.candidateId);
      } else {
        selectedIds.add(match.candidateId);
      }
    };

    const inactiveArchivedMatch = resolveMatch({
      id: 'cand-archived',
      productAId: focalProductId,
      productBId: 'prod-b',
      productBIsArchived: true,
      productBIsDeleted: false,
    }, focalProductId);

    const inactiveDeletedMatch = resolveMatch({
      id: 'cand-deleted',
      productAId: focalProductId,
      productBId: 'prod-c',
      productBIsArchived: false,
      productBIsDeleted: true,
    }, focalProductId);

    const activeMatch = resolveMatch({
      id: 'cand-active',
      productAId: focalProductId,
      productBId: 'prod-d',
      productBIsArchived: false,
      productBIsDeleted: false,
    }, focalProductId);

    // Attempt to toggle archived match
    toggleSelect(inactiveArchivedMatch);
    assert.equal(selectedIds.has('cand-archived'), false, 'Archived candidate must not be selectable');
    assert.equal(snackMessage, 'Cannot merge with archived product');

    // Attempt to toggle soft-deleted match
    toggleSelect(inactiveDeletedMatch);
    assert.equal(selectedIds.has('cand-deleted'), false, 'Soft-deleted candidate must not be selectable');
    assert.equal(snackMessage, 'Cannot merge with soft-deleted product');

    // Toggle active match
    toggleSelect(activeMatch);
    assert.equal(selectedIds.has('cand-active'), true, 'Active candidate should be selectable');
  });

  test('merge execution guard: rejects merge attempt against inactive product', () => {
    let mergeExecuted = false;
    let alertTitle: string | null = null;
    let alertMessage: string | null = null;

    const handleMergeOne = (match: ReturnType<typeof resolveMatch>) => {
      if (match.isInactive) {
        alertTitle = 'Cannot Merge';
        alertMessage = match.otherIsDeleted
          ? 'This product is soft-deleted and cannot be merged.'
          : 'This product is archived and cannot be merged.';
        return;
      }
      mergeExecuted = true;
    };

    const archivedMatch = resolveMatch({
      id: 'cand-archived',
      productAId: focalProductId,
      productBId: 'prod-b',
      productBIsArchived: true,
    }, focalProductId);

    handleMergeOne(archivedMatch);
    assert.equal(mergeExecuted, false);
    assert.equal(alertTitle, 'Cannot Merge');
    assert.equal(alertMessage, 'This product is archived and cannot be merged.');

    // Reset and try active match
    mergeExecuted = false;
    alertTitle = null;
    const activeMatch = resolveMatch({
      id: 'cand-active',
      productAId: focalProductId,
      productBId: 'prod-c',
      productBIsArchived: false,
      productBIsDeleted: false,
    }, focalProductId);

    handleMergeOne(activeMatch);
    assert.equal(mergeExecuted, true);
    assert.equal(alertTitle, null);
  });

  test('tile presentation rules: inactive candidates render faded (opacity 0.5), show lock, and keep preview link', () => {
    interface TileStyleProps {
      opacity: number;
      selectionControl: 'circle' | 'lock';
      badgeLabel: string | null;
      badgeColor: string | null;
      previewTargetId: string;
    }

    const computeTileProps = (match: ReturnType<typeof resolveMatch>): TileStyleProps => {
      const isDismissed = match.status === 'dismissed';
      const isFaded = isDismissed || match.isInactive;

      let badgeLabel: string | null = null;
      let badgeColor: string | null = null;
      if (match.otherIsDeleted) {
        badgeLabel = 'Deleted';
        badgeColor = '#EF4444EE';
      } else if (match.otherIsArchived) {
        badgeLabel = 'Archived';
        badgeColor = '#F59E0BEE';
      } else if (isDismissed) {
        badgeLabel = 'Dismissed';
        badgeColor = 'rgba(0,0,0,0.55)';
      }

      return {
        opacity: isFaded ? 0.5 : 1.0,
        selectionControl: match.isInactive ? 'lock' : 'circle',
        badgeLabel,
        badgeColor,
        previewTargetId: match.otherId,
      };
    };

    const archivedMatch = resolveMatch({
      id: 'cand-archived',
      productAId: focalProductId,
      productBId: 'prod-archived-99',
      productBIsArchived: true,
      productBIsDeleted: false,
    }, focalProductId);

    const props = computeTileProps(archivedMatch);

    assert.equal(props.opacity, 0.5, 'Inactive tile must be visually faded with opacity 0.5');
    assert.equal(props.selectionControl, 'lock', 'Inactive tile must show lock icon instead of selection circle');
    assert.equal(props.badgeLabel, 'Archived', 'Must display Archived badge');
    assert.equal(props.badgeColor, '#F59E0BEE', 'Archived badge must be amber');
    assert.equal(props.previewTargetId, 'prod-archived-99', 'Preview target ID must be preserved for navigation');
  });
});
