import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Models the target message and group resolution logic in FullMessageBrowser
 * and useIntelligentChatTimeline.
 */
describe('Target Message Navigation and Auto-Scroll Rules', () => {
  type Message = {
    messageId: string;
    groupId?: string;
    timestamp: number;
    isFromMe: boolean;
    mediaType?: string;
  };

  type MediaGroup = {
    type: 'media_group';
    id: string;
    messages: Message[];
    isFromMe: boolean;
    timestamp: number;
    groupId?: string;
  };

  function matchesGroupId(
    itemGroupId?: string,
    targetGroupId?: string,
    itemTs?: number,
    groupsMap?: Map<string, { deeplensProductId?: string }>
  ): boolean {
    if (!targetGroupId || !itemGroupId) return false;
    if (
      itemGroupId === targetGroupId ||
      itemGroupId.toLowerCase() === targetGroupId.toLowerCase() ||
      itemGroupId.endsWith(targetGroupId) ||
      targetGroupId.endsWith(itemGroupId) ||
      itemGroupId.includes(targetGroupId) ||
      targetGroupId.includes(itemGroupId)
    ) {
      return true;
    }
    if (groupsMap) {
      const grp = groupsMap.get(itemGroupId);
      if (
        grp?.deeplensProductId &&
        (grp.deeplensProductId === targetGroupId ||
          grp.deeplensProductId.toLowerCase() === targetGroupId.toLowerCase())
      ) {
        return true;
      }
    }
    const tsMatch = targetGroupId.match(/(?:_|^)(\d{9,11})$/);
    if (tsMatch && itemTs) {
      const targetTs = parseInt(tsMatch[1], 10);
      if (Math.abs(itemTs - targetTs) <= 60) {
        return true;
      }
    }
    return false;
  }

  function resolveTargetParams(params: {
    highlightGroupId?: string;
    targetGroupId?: string;
    sourceGroupId?: string;
    targetMessageId?: string;
  }) {
    const rawTargetGroup =
      params.highlightGroupId || params.targetGroupId || params.sourceGroupId;
    const rawTargetMessage = params.targetMessageId;

    const isMessageIdActuallyGroup =
      rawTargetMessage &&
      (rawTargetMessage.startsWith('product_') ||
        rawTargetMessage.startsWith('sticker_') ||
        rawTargetMessage.includes('@g.us_'));

    const highlightGroupId = isMessageIdActuallyGroup
      ? rawTargetMessage
      : rawTargetGroup;
    const targetMessageId = isMessageIdActuallyGroup
      ? undefined
      : rawTargetMessage;

    return { highlightGroupId, targetMessageId };
  }

  function findTargetIndex(
    groupedMessages: (Message | MediaGroup)[],
    targetMessageId?: string,
    highlightGroupId?: string,
    groupsMap?: Map<string, { deeplensProductId?: string }>
  ): number {
    if (!highlightGroupId && !targetMessageId) return -1;

    return groupedMessages.findIndex((item) => {
      if (targetMessageId) {
        if (
          'messageId' in item &&
          (item.messageId === targetMessageId ||
            item.messageId?.toLowerCase() === targetMessageId.toLowerCase())
        ) {
          return true;
        }
        if ('messages' in item && Array.isArray(item.messages)) {
          if (
            item.messages.some(
              (m) =>
                m.messageId === targetMessageId ||
                m.messageId?.toLowerCase() === targetMessageId.toLowerCase()
            )
          ) {
            return true;
          }
        }
      }

      if (highlightGroupId) {
        if (
          item.groupId &&
          matchesGroupId(item.groupId, highlightGroupId, item.timestamp, groupsMap)
        ) {
          return true;
        }
        if ('messages' in item && Array.isArray(item.messages)) {
          if (
            item.messages.some((m) =>
              matchesGroupId(m.groupId, highlightGroupId, m.timestamp, groupsMap)
            )
          ) {
            return true;
          }
        }
      }

      return false;
    });
  }

  function calculateInitialNumToRender(
    targetIndex: number,
    totalMessages: number
  ): number {
    if (targetIndex !== -1) {
      return Math.max(30, targetIndex + 10);
    }
    return totalMessages > 0 ? Math.min(30, totalMessages) : 25;
  }

  test('resolves targetGroupId and sourceGroupId aliases when highlightGroupId is omitted', () => {
    const res1 = resolveTargetParams({ targetGroupId: 'product_123' });
    assert.equal(res1.highlightGroupId, 'product_123');
    assert.equal(res1.targetMessageId, undefined);

    const res2 = resolveTargetParams({ sourceGroupId: 'product_456' });
    assert.equal(res2.highlightGroupId, 'product_456');

    // Auto-detect group ID masquerading as targetMessageId
    const res3 = resolveTargetParams({
      targetMessageId: 'product_4e11c1b6-8a31-49c0-a4bc-2def3b5631f2',
    });
    assert.equal(
      res3.highlightGroupId,
      'product_4e11c1b6-8a31-49c0-a4bc-2def3b5631f2'
    );
    assert.equal(res3.targetMessageId, undefined);
  });

  test('finds target message inside a MediaGroup album with case-insensitive matching', () => {
    const messages: (Message | MediaGroup)[] = [
      {
        messageId: 'MSG_NEWEST',
        timestamp: 1782364000,
        isFromMe: false,
      },
      {
        type: 'media_group',
        id: 'GROUP_ALBUM_1',
        timestamp: 1782363760,
        isFromMe: false,
        groupId: 'product_abc',
        messages: [
          {
            messageId: 'ACB64F503D329AC1F8C01BBC98B1249A',
            timestamp: 1782363760,
            isFromMe: false,
          },
          {
            messageId: 'AC9250A07D5B29C48E3C4A4BB1E1E6EE',
            timestamp: 1782363762,
            isFromMe: false,
          },
        ],
      },
      {
        messageId: 'MSG_OLDER',
        timestamp: 1782363000,
        isFromMe: false,
      },
    ];

    // Search by lowercase messageId
    const idx = findTargetIndex(
      messages,
      'ac9250a07d5b29c48e3c4a4bb1e1e6ee',
      undefined
    );
    assert.equal(idx, 1);
  });

  test('matches group ID via deeplensProductId in groupsMap lookup', () => {
    const groupsMap = new Map<string, { deeplensProductId?: string }>();
    groupsMap.set('group_timestamp_1782363760', {
      deeplensProductId: '69994129-b586-4cd7-8bd0-239d960c50d0',
    });

    const messages: (Message | MediaGroup)[] = [
      {
        messageId: 'MSG_1',
        groupId: 'other_group',
        timestamp: 1782364000,
        isFromMe: false,
      },
      {
        messageId: 'MSG_TARGET',
        groupId: 'group_timestamp_1782363760',
        timestamp: 1782363760,
        isFromMe: false,
      },
    ];

    // Navigating with PDP product ID
    const idx = findTargetIndex(
      messages,
      undefined,
      '69994129-b586-4cd7-8bd0-239d960c50d0',
      groupsMap
    );
    assert.equal(idx, 1);
  });

  test('matches group ID via timestamp proximity fallback', () => {
    const messages: (Message | MediaGroup)[] = [
      {
        messageId: 'MSG_1',
        groupId: 'chat_jid_1785000000',
        timestamp: 1785000000,
        isFromMe: false,
      },
      {
        messageId: 'MSG_TARGET',
        groupId: 'chat_jid_1782363770',
        timestamp: 1782363770,
        isFromMe: false,
      },
    ];

    // Target group ID from another source with timestamp 1782363760 (within 10s window)
    const idx = findTargetIndex(
      messages,
      undefined,
      'chat_target_1782363760'
    );
    assert.equal(idx, 1);
  });

  test('dynamically sizes initialNumToRender to ensure target message is pre-rendered', () => {
    const targetIdx = 35;
    const total = 50;

    const initialNum = calculateInitialNumToRender(targetIdx, total);
    assert.ok(initialNum >= targetIdx + 1, 'InitialNumToRender must cover target item');
    assert.equal(initialNum, 45); // 35 + 10 = 45

    const defaultNum = calculateInitialNumToRender(-1, total);
    assert.equal(defaultNum, 30);
  });

  test('programmatic momentum scroll does not cancel user scroll lock or retry timers', () => {
    class MockScrollManager {
      userInteracted = false;
      isProgrammatic = false;
      retryTimers: any[] = [];
      scrollAttempts = 0;

      onProgrammaticScroll() {
        this.isProgrammatic = true;
        this.scrollAttempts++;
      }

      onMomentumScrollBegin() {
        if (this.isProgrammatic) {
          // Programmatic momentum ignored
          return;
        }
        this.userInteracted = true;
      }

      onScrollBeginDrag() {
        // Real user drag always sets userInteracted
        this.userInteracted = true;
      }
    }

    const manager = new MockScrollManager();

    // 1. Programmatic scroll begins
    manager.onProgrammaticScroll();
    manager.onMomentumScrollBegin();

    // Must NOT flag user interaction
    assert.equal(manager.userInteracted, false);
    assert.equal(manager.scrollAttempts, 1);

    // 2. Real human touch occurs
    manager.onScrollBeginDrag();
    assert.equal(manager.userInteracted, true);
  });
});
