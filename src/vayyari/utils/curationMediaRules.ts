import { StoreCurationMediaItem, StoreColorGroup } from '../components/tamagui-ui/organisms/StoreCuration/types';

/**
 * Filter qualified media for PDP preview or live catalog display based on active color group.
 *
 * Rules:
 * 1. Common media items (isCommon === true) are included across all colorways.
 * 2. Items assigned explicitly to activeGroup.id are included.
 * 3. Items with no colorGroupId assigned are included if only 1 colorway exists or as fallback.
 * 4. If no items match after filtering, all qualified media is used as fallback.
 * 5. Media items are sorted by sortOrder ascending.
 */
export function filterPreviewMedia(
  qualifiedMedia: StoreCurationMediaItem[],
  colorGroups: StoreColorGroup[],
  previewActiveGroupId?: string | null
): StoreCurationMediaItem[] {
  const activeGroup = colorGroups.find((g) => g.id === previewActiveGroupId) || colorGroups[0];
  const filtered = qualifiedMedia.filter((m) => {
    if (m.isCommon) return true;
    if (m.colorGroupId && activeGroup?.id) return m.colorGroupId === activeGroup.id;
    return !m.colorGroupId || colorGroups.length <= 1;
  });
  const result = filtered.length > 0 ? filtered : qualifiedMedia;
  return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Toggles a media item's assignment to a color group tab.
 * If already assigned to targetGroupId, unassigns it.
 * Otherwise, assigns it to targetGroupId and marks isCommon = false.
 */
export function toggleMediaGroupAssignment(
  item: StoreCurationMediaItem,
  targetGroupId: string
): StoreCurationMediaItem {
  if (item.colorGroupId === targetGroupId) {
    return { ...item, colorGroupId: undefined };
  }
  return { ...item, colorGroupId: targetGroupId, isCommon: false };
}

/**
 * Toggles a media item's universal craft (isCommon) flag.
 * If set to common, unassigns any specific colorGroupId.
 */
export function toggleMediaCommonStatus(
  item: StoreCurationMediaItem
): StoreCurationMediaItem {
  const nextCommon = !item.isCommon;
  return {
    ...item,
    isCommon: nextCommon,
    colorGroupId: nextCommon ? undefined : item.colorGroupId,
  };
}

/**
 * Unlinks media items assigned to a discarded color group ID.
 */
export function unlinkDiscardedMedia(
  mediaList: StoreCurationMediaItem[],
  discardId: string
): StoreCurationMediaItem[] {
  return mediaList.map((m) =>
    m.colorGroupId === discardId ? { ...m, colorGroupId: undefined } : m
  );
}
