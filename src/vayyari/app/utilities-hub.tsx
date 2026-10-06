import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  LuPlus,
  LuCopy,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import {
  getSnippets,
  upsertSnippet,
  deleteSnippet,
  recordCopy,
  getRecentCopies,
  Snippet,
  RecentCopy,
} from '@/utils/SnippetStore';
import { SnippetChip } from '@/components/tamagui-ui/molecules/SnippetChip';
import { AddSnippetSheet } from '@/components/tamagui-ui/molecules/AddSnippetSheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * UtilitiesHubScreen
 *
 * A dedicated screen for quick-copy operational snippets.
 * Replaces the right-swipe-to-AI gesture on the Operations Hub home screen.
 *
 * Features:
 *  - Wrapping pill chip row with a leading "+ Add" chip
 *  - Tap chip → copy content to clipboard + haptic feedback
 *  - Long press chip → open edit sheet
 *  - Recent Copies section showing last 3 clipboard actions
 */
interface UtilitiesHubScreenProps {
  onDismiss?: () => void;
}

export default function UtilitiesHubScreen({ onDismiss }: UtilitiesHubScreenProps = {}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [recentCopies, setRecentCopies] = useState<RecentCopy[]>([]);

  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    const [s, r] = await Promise.all([getSnippets(), getRecentCopies()]);
    setSnippets(s);
    setRecentCopies(r.slice(0, 3));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCopy = async (snippet: Snippet) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(snippet.content);
    await recordCopy(snippet);

    // Show brief copied indicator
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1800);

    // Refresh recents
    const updated = await getRecentCopies();
    setRecentCopies(updated.slice(0, 3));
  };

  const handleLongPress = (snippet: Snippet) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingSnippet(snippet);
    setSheetVisible(true);
  };

  const handleAddChip = () => {
    setEditingSnippet(null);
    setSheetVisible(true);
  };

  const handleSave = async (
    data: Omit<Snippet, 'sortOrder' | 'createdAt'>
  ) => {
    const now = Date.now();
    const existing = snippets.find((s) => s.id === data.id);
    await upsertSnippet({
      ...data,
      sortOrder: existing?.sortOrder ?? snippets.length,
      createdAt: existing?.createdAt ?? now,
    });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteSnippet(id);
    await loadData();
  };

  // ---------------------------------------------------------------------------
  // Gesture
  // ---------------------------------------------------------------------------

  // Swift left-swipe to dismiss page (towards left)
  const dismissGesture = Gesture.Pan()
    .activeOffsetX(-15)
    .failOffsetY([-25, 25])
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -30 || e.velocityX < -250) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onDismiss) {
          onDismiss();
        } else {
          router.back();
        }
      }
    });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const indigo = '#6366F1';

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ── Header ── */}
      <XStack
        paddingTop={insets.top}
        height={52 + insets.top}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={14}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <YStack gap={1}>
          <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            Utilities
          </Text>
          <Text fontSize={11} color={tokens.textMuted}>
            Copy snippets & quick tools
          </Text>
        </YStack>

        {/* Swipe back indicator badge (Tap or swipe left to dismiss) */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onDismiss) {
              onDismiss();
            } else {
              router.back();
            }
          }}
          style={{ cursor: 'pointer' } as any}
        >
          <XStack
            paddingVertical={4}
            paddingHorizontal={10}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            borderWidth={1}
            borderColor={tokens.border}
            alignItems="center"
            gap={4}
          >
            <Text fontSize={11} fontWeight="600" color={tokens.textMuted}>
              Swipe ◄ back
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* ── Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: Math.max(24, insets.bottom + 16),
          gap: 12,
        }}
      >

        {/* ── Copy Snippets (Uncontained Edge-to-Edge) ── */}
        <YStack gap={10}>
          {/* Section label */}
          <Text
            fontSize={11}
            fontWeight="700"
            color={tokens.textMuted}
            letterSpacing={1.2}
          >
            COPY SNIPPETS
          </Text>

          {/* Chip row — wrapping flex layout */}
          <View style={styles.chipRow}>

            {/* "+ Add" chip — always first */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new snippet"
              onPress={handleAddChip}
              style={({ pressed }) => [styles.addChipPressable, pressed && styles.pressed]}
            >
              <XStack
                height={34}
                borderRadius={tokens.radius.full}
                borderWidth={1.5}
                borderColor={indigo}
                backgroundColor={`${indigo}14`}
                paddingHorizontal={11}
                alignItems="center"
                gap={4}
                style={styles.dashedBorder}
              >
                <LuPlus size={12} color={indigo} />
                <Text fontSize={12} fontWeight="600" color={indigo}>
                  Add
                </Text>
              </XStack>
            </Pressable>

            {/* Snippet chips */}
            {snippets.map((snippet) => {
              const isCopied = copiedId === snippet.id;
              return (
                <View key={snippet.id} style={styles.chipWrapper}>
                  {isCopied ? (
                    // Brief "Copied!" state
                    <XStack
                      height={34}
                      borderRadius={tokens.radius.full}
                      borderWidth={1}
                      borderColor={`${snippet.color}4D`}
                      backgroundColor={`${snippet.color}28`}
                      paddingHorizontal={11}
                      alignItems="center"
                      gap={5}
                    >
                      <LuCopy size={11} color={snippet.color} />
                      <Text fontSize={12} fontWeight="600" color={snippet.color}>
                        Copied!
                      </Text>
                    </XStack>
                  ) : (
                    <SnippetChip
                      id={snippet.id}
                      label={snippet.label}
                      emoji={snippet.emoji}
                      color={snippet.color}
                      onPress={() => handleCopy(snippet)}
                      onLongPress={() => handleLongPress(snippet)}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </YStack>

        {/* ── Recent Copies Card ── */}
        {recentCopies.length > 0 && (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            paddingVertical={12}
            paddingHorizontal={14}
            gap={0}
          >
            <Text
              fontSize={10}
              fontWeight="700"
              color={tokens.textMuted}
              letterSpacing={1.2}
              paddingBottom={10}
            >
              RECENT COPIES
            </Text>

            {recentCopies.map((item, idx) => (
              <React.Fragment key={`${item.snippetId}-${item.copiedAt}`}>
                {idx > 0 && (
                  <YStack
                    height={StyleSheet.hairlineWidth}
                    backgroundColor={tokens.border}
                    marginVertical={8}
                  />
                )}
                <XStack alignItems="center" gap={10}>
                  <Text fontSize={20} style={{ width: 28, textAlign: 'center' }}>
                    {item.emoji}
                  </Text>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={13} fontWeight="700" color={tokens.text} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text fontSize={11} color={tokens.textMuted} numberOfLines={1}>
                      {item.preview}
                    </Text>
                  </YStack>
                  <Text fontSize={11} color={tokens.textMuted}>
                    {formatRelativeTime(item.copiedAt)}
                  </Text>
                </XStack>
              </React.Fragment>
            ))}
          </YStack>
        )}

      </ScrollView>

      {/* ── Add / Edit Sheet ── */}
      <AddSnippetSheet
        visible={sheetVisible}
        existing={editingSnippet}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => {
          setSheetVisible(false);
          setEditingSnippet(null);
        }}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrapper: {
    // ensures chips size to their content
  },
  addChipPressable: {
    borderRadius: 9999,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  // Dashed border approximation — React Native doesn't support dashed borderStyle on XStack,
  // so we rely on the distinct indigo color + lighter bg to signal the "add" affordance.
  dashedBorder: {
    // borderStyle: 'dashed' only works on Views in RN (not all platforms), skipped intentionally
  },
});
