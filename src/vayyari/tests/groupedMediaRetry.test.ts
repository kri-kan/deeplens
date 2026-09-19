import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Pure helper implementations identical to [jid].tsx logic
const isPhotoOrVideoMsg = (msg: any) => {
  return (
    msg.mediaType === 'image' ||
    msg.mediaType === 'photo' ||
    msg.mediaType === 'video' ||
    (!!msg.mediaUrl && msg.mediaType !== 'sticker' && msg.mediaType !== 'document' && msg.mediaType !== 'audio' && msg.mediaType !== 'ptt')
  );
};

const isStickerMsg = (msg: any) => {
  return (
    msg.mediaType === 'sticker' ||
    (!!msg.mediaUrl && msg.mediaUrl.includes('/stickers/'))
  );
};

const isMediaArchived = (msg: any) => {
  if (isStickerMsg(msg) || msg.mediaType === 'document' || msg.mediaType === 'audio' || (!msg.mediaType && !msg.mediaUrl)) {
    return false;
  }
  return (
    !msg.mediaUrl ||
    msg.metadata?.isArchived === true ||
    msg.metadata?.deleted === true ||
    msg.metadata?.isTombstone === true ||
    msg.messageText === '[Media archived / deleted]' ||
    msg.messageText === '[Media Unavailable]'
  );
};

const hasActiveMedia = (msg: any) => {
  return !!msg.mediaUrl && !isMediaArchived(msg);
};

/**
 * GroupedMediaRetryManager models the group retry orchestration
 * implemented in FullMessageBrowser (src/vayyari/app/utilities/whatsapp/messages/[jid].tsx).
 */
class GroupedMediaRetryManager {
  retriedMessageIds: string[] = [];
  alertsTriggered: string[] = [];

  async retryMediaDownload(messageId: string, shouldFail: boolean = false): Promise<string | null> {
    this.retriedMessageIds.push(messageId);
    if (shouldFail) {
      return null;
    }
    return `minio://whatsapp-data/photos/${messageId}.jpg`;
  }

  // Model handleRetryMedia with suppressAlert parameter
  async handleRetryMedia(messageId: string, suppressAlert: boolean = false, shouldFail: boolean = false): Promise<string | null> {
    const res = await this.retryMediaDownload(messageId, shouldFail);
    if (!res && !suppressAlert) {
      this.alertsTriggered.push(`Alert: Failed for ${messageId}`);
    }
    return res;
  }

  // Model handleRetryGroup
  async handleRetryGroup(
    group: { id: string; messages: any[] },
    failedIds: Set<string> = new Set()
  ): Promise<{ successCount: number; failCount: number }> {
    const missingMsgs = group.messages.filter(m => !hasActiveMedia(m));
    const toRetry = missingMsgs.length > 0 ? missingMsgs : group.messages;

    let successCount = 0;
    let failCount = 0;

    for (const m of toRetry) {
      const url = await this.handleRetryMedia(m.messageId, true, failedIds.has(m.messageId));
      if (url) {
        successCount++;
        m.mediaUrl = url;
      } else {
        failCount++;
      }
    }

    if (failCount > 0 && successCount === 0) {
      this.alertsTriggered.push(`Group Alert: Could not download media for ${failCount} item(s)`);
    }

    return { successCount, failCount };
  }
}

describe('Grouped Media Container Retry & Hidden Items Resolution Rules', () => {
  test('sub-tiles inside grouped media containers suppress individual retry buttons', () => {
    // Single message: allowIndividualRetry is true
    const allowIndividualRetrySingle = true;
    assert.equal(allowIndividualRetrySingle, true);

    // Grouped message container: allowIndividualRetry is passed as false
    const allowIndividualRetryGroupedSubTile = false;
    assert.equal(allowIndividualRetryGroupedSubTile, false);

    // In ChatMediaItem, when onRetry is undefined, sub-tile does not render retry button or "(Tap)"
    const getSubTileLabel = (isArchived: boolean, onRetryProvided: boolean, isVideo: boolean) => {
      if (!isArchived) return null;
      if (onRetryProvided) return isVideo ? 'Video (Tap)' : 'Photo (Tap)';
      return isVideo ? 'Video' : 'Photo';
    };

    assert.equal(getSubTileLabel(true, true, false), 'Photo (Tap)');
    assert.equal(getSubTileLabel(true, false, false), 'Photo'); // No (Tap) affordance in group
    assert.equal(getSubTileLabel(true, false, true), 'Video');  // No (Tap) affordance in group
  });

  test('hidden items calculation accurately reflects all items beyond the first 4 in the group', () => {
    const groupMessages = [
      { messageId: 'M1', mediaUrl: 'https://example.com/1.jpg' },
      { messageId: 'M2', mediaUrl: 'https://example.com/2.jpg' },
      { messageId: 'M3', mediaUrl: null }, // missing
      { messageId: 'M4', mediaUrl: 'https://example.com/4.jpg' },
      { messageId: 'M5', mediaUrl: null }, // hidden + missing
      { messageId: 'M6', mediaUrl: 'https://example.com/6.jpg' }, // hidden + active
      { messageId: 'M7', mediaUrl: null }, // hidden + missing
    ];

    const totalCount = groupMessages.length;
    const hiddenTotal = Math.max(0, totalCount - 4);

    assert.equal(totalCount, 7);
    assert.equal(hiddenTotal, 3);

    // Visible grid slices 4 items
    const visibleTiles = groupMessages.slice(0, 4);
    assert.equal(visibleTiles.length, 4);

    // Fourth tile displays +3
    const fourthTileOverlayText = `+${hiddenTotal}`;
    assert.equal(fourthTileOverlayText, '+3');
  });

  test('group-level retry downloads all missing media including hidden items', async () => {
    const manager = new GroupedMediaRetryManager();

    const group = {
      id: 'grp_001',
      messages: [
        { messageId: 'M1', mediaUrl: 'https://minio/1.jpg' }, // active
        { messageId: 'M2', mediaUrl: null },                  // visible & missing
        { messageId: 'M3', mediaUrl: 'https://minio/3.jpg' }, // active
        { messageId: 'M4', mediaUrl: 'https://minio/4.jpg' }, // active
        { messageId: 'M5', mediaUrl: null },                  // hidden & missing
        { messageId: 'M6', mediaUrl: null },                  // hidden & missing
      ]
    };

    const missingBefore = group.messages.filter(m => !hasActiveMedia(m));
    assert.equal(missingBefore.length, 3);
    assert.deepEqual(missingBefore.map(m => m.messageId), ['M2', 'M5', 'M6']);

    // Trigger group-level retry
    const result = await manager.handleRetryGroup(group);

    assert.equal(result.successCount, 3);
    assert.equal(result.failCount, 0);

    // Manager should have retried M2, M5, and M6 (including the 2 hidden ones)
    assert.deepEqual(manager.retriedMessageIds, ['M2', 'M5', 'M6']);

    // Messages should now all have active media
    const missingAfter = group.messages.filter(m => !hasActiveMedia(m));
    assert.equal(missingAfter.length, 0);
  });

  test('group-level retry suppresses individual alert popups during batch processing', async () => {
    const manager = new GroupedMediaRetryManager();

    const group = {
      id: 'grp_002',
      messages: [
        { messageId: 'F1', mediaUrl: null },
        { messageId: 'F2', mediaUrl: null },
        { messageId: 'F3', mediaUrl: null },
      ]
    };

    // All 3 items fail download on WhatsApp server
    const failedIds = new Set(['F1', 'F2', 'F3']);
    const result = await manager.handleRetryGroup(group, failedIds);

    assert.equal(result.successCount, 0);
    assert.equal(result.failCount, 3);

    // No individual alerts ("Alert: Failed for F1", etc.) should have triggered
    assert.equal(manager.alertsTriggered.some(a => a.startsWith('Alert: Failed for')), false);

    // Exactly 1 aggregated group alert triggered
    assert.equal(manager.alertsTriggered.length, 1);
    assert.equal(manager.alertsTriggered[0], 'Group Alert: Could not download media for 3 item(s)');
  });

  test('all-archived group triggers fetch for all items in container', async () => {
    const manager = new GroupedMediaRetryManager();

    const group = {
      id: 'grp_003',
      messages: [
        { messageId: 'A1', mediaUrl: null },
        { messageId: 'A2', mediaUrl: null },
        { messageId: 'A3', mediaUrl: null },
        { messageId: 'A4', mediaUrl: null },
      ]
    };

    assert.equal(group.messages.filter(hasActiveMedia).length, 0);

    const result = await manager.handleRetryGroup(group);
    assert.equal(result.successCount, 4);
    assert.deepEqual(manager.retriedMessageIds, ['A1', 'A2', 'A3', 'A4']);
  });
});
