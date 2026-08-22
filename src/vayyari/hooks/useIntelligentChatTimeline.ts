import { useState, useEffect, useCallback, useRef } from 'react';
import { waProcessorService, Message } from '@/services/wa-processor.service';

export interface UseIntelligentChatTimelineOptions {
  jid: string | null;
  targetMessageId?: string;
  targetTimestamp?: number;
  highlightGroupId?: string;
  searchQuery?: string;
  pageSize?: number;
}

export function useIntelligentChatTimeline({
  jid,
  targetMessageId,
  targetTimestamp,
  highlightGroupId,
  searchQuery,
  pageSize = 50,
}: UseIntelligentChatTimelineOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLatestLoaded, setIsLatestLoaded] = useState(true);
  const [targetIndex, setTargetIndex] = useState<number>(-1);

  const isFetchingRef = useRef(false);

  // Helper to deduplicate and sort messages by timestamp DESC (index 0 = newest message for inverted FlatList)
  const mergeMessages = useCallback((existing: Message[], incoming: Message[]) => {
    const map = new Map<string, Message>();
    existing.forEach((m) => map.set(m.messageId, m));
    incoming.forEach((m) => map.set(m.messageId, m));
    const merged = Array.from(map.values());
    merged.sort((a, b) => b.timestamp - a.timestamp); // DESC: newest first
    return merged;
  }, []);

  // Initial Load / Re-anchoring
  const initTimeline = useCallback(async () => {
    if (!jid) return;
    setLoading(true);
    try {
      if (targetMessageId || targetTimestamp || highlightGroupId || searchQuery) {
        // Fetch anchored batch around target or highlighted group
        const res = await waProcessorService.fetchMessages(
          jid,
          pageSize,
          0,
          highlightGroupId,
          searchQuery,
          { targetMessageId, targetTimestamp }
        );

        setMessages(mergeMessages([], res.messages));
        setHasMoreOlder(true);
        // If specific target message/timestamp or highlight group requested, we might be in historical window
        const isHistoricalTarget = !!(targetMessageId || targetTimestamp || highlightGroupId);
        setIsLatestLoaded(!isHistoricalTarget);

        if (targetMessageId) {
          const idx = res.messages.findIndex((m) => m.messageId === targetMessageId);
          setTargetIndex(idx);
        } else {
          setTargetIndex(-1);
        }
      } else {
        // Default latest load
        const res = await waProcessorService.fetchMessages(jid, pageSize, 0);
        setMessages(mergeMessages([], res.messages));
        setHasMoreOlder(res.messages.length >= pageSize);
        setIsLatestLoaded(true);
        setTargetIndex(-1);
      }
    } catch (err) {
      console.error('Failed to initialize chat timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [jid, targetMessageId, targetTimestamp, highlightGroupId, searchQuery, pageSize, mergeMessages]);

  useEffect(() => {
    initTimeline();
  }, [initTimeline]);

  // Backfill older messages (Scroll UP towards top of screen)
  const loadOlder = useCallback(async () => {
    if (!jid || isFetchingRef.current || !hasMoreOlder || messages.length === 0) return;
    // When sorted DESC, messages[messages.length - 1] is the oldest message currently loaded
    const oldestTs = messages[messages.length - 1].timestamp;
    if (!oldestTs) return;

    isFetchingRef.current = true;
    setLoadingOlder(true);

    try {
      const res = await waProcessorService.fetchMessages(
        jid,
        pageSize,
        0,
        undefined,
        undefined,
        { beforeTimestamp: oldestTs }
      );

      if (res.messages.length === 0) {
        setHasMoreOlder(false);
      } else {
        setMessages((prev) => mergeMessages(prev, res.messages));
        if (res.messages.length < pageSize) {
          setHasMoreOlder(false);
        }
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
      isFetchingRef.current = false;
    }
  }, [jid, messages, hasMoreOlder, pageSize, mergeMessages]);

  // Forward-fill newer messages (Scroll DOWN when detached from latest edge)
  const loadNewer = useCallback(async () => {
    if (!jid || isFetchingRef.current || isLatestLoaded || messages.length === 0) return;
    // When sorted DESC, messages[0] is the newest message currently loaded
    const newestTs = messages[0].timestamp;
    if (!newestTs) return;

    isFetchingRef.current = true;
    setLoadingNewer(true);

    try {
      const res = await waProcessorService.fetchMessages(
        jid,
        pageSize,
        0,
        undefined,
        undefined,
        { afterTimestamp: newestTs }
      );

      if (res.messages.length === 0 || res.messages.length < pageSize) {
        setIsLatestLoaded(true);
      }
      if (res.messages.length > 0) {
        setMessages((prev) => mergeMessages(prev, res.messages));
      }
    } catch (err) {
      console.error('Failed to load newer messages:', err);
    } finally {
      setLoadingNewer(false);
      isFetchingRef.current = false;
    }
  }, [jid, messages, isLatestLoaded, pageSize, mergeMessages]);

  // Fill gap between two timestamps
  const fillGap = useCallback(
    async (fromTs: number, toTs: number) => {
      if (!jid) return;
      try {
        const res = await waProcessorService.fetchMessages(
          jid,
          100,
          0,
          undefined,
          undefined,
          { fromTimestamp: fromTs, toTimestamp: toTs }
        );
        if (res.messages.length > 0) {
          setMessages((prev) => mergeMessages(prev, res.messages));
        }
      } catch (err) {
        console.error('Failed to fill message gap:', err);
      }
    },
    [jid, mergeMessages]
  );

  // Reset window and jump to latest messages
  const jumpToLatest = useCallback(async () => {
    if (!jid) return;
    setLoading(true);
    try {
      const res = await waProcessorService.fetchMessages(jid, pageSize, 0);
      setMessages(mergeMessages([], res.messages));
      setHasMoreOlder(res.messages.length >= pageSize);
      setIsLatestLoaded(true);
      setTargetIndex(-1);
    } catch (err) {
      console.error('Failed to jump to latest messages:', err);
    } finally {
      setLoading(false);
    }
  }, [jid, pageSize, mergeMessages]);

  return {
    messages,
    loading,
    loadingOlder,
    loadingNewer,
    hasMoreOlder,
    isLatestLoaded,
    targetIndex,
    loadOlder,
    loadNewer,
    jumpToLatest,
    fillGap,
    refresh: initTimeline,
  };
}
