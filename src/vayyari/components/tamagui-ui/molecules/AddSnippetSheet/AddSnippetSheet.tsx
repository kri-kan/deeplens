import React, { useState, useEffect, useRef } from 'react';
import {
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuCheck,
  LuTrash2,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { BottomSheet } from '../../atoms/BottomSheet';
import { Snippet } from '@/utils/SnippetStore';

// ---------------------------------------------------------------------------
// Preset color + emoji options
// ---------------------------------------------------------------------------

const PRESET_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#F43F5E', // rose
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

const PRESET_EMOJIS = [
  '📍', '💳', '↩️', '📦', '⚠️', '✉️', '📋', '💬',
  '🏠', '📞', '🚚', '💡', '🔖', '📝', '✅', '🎁',
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AddSnippetSheetProps {
  visible: boolean;
  /** If provided, sheet operates in edit mode pre-populated with snippet */
  existing?: Snippet | null;
  onSave: (snippet: Omit<Snippet, 'sortOrder' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

/**
 * AddSnippetSheet
 *
 * A bottom-sheet modal for creating or editing a copy snippet.
 * Supports:
 *  - Label input (single line)
 *  - Emoji picker (preset grid)
 *  - Color picker (preset swatches)
 *  - Content textarea (multiline, scrollable)
 *  - Delete action (edit mode only)
 */
export function AddSnippetSheet({
  visible,
  existing,
  onSave,
  onDelete,
  onClose,
}: AddSnippetSheetProps) {
  const { tokens } = useTheme();
  const isEdit = !!existing;

  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('📋');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [content, setContent] = useState('');

  const labelRef = useRef<RNTextInput>(null);

  // Sync form state when sheet opens or existing snippet changes
  useEffect(() => {
    if (visible) {
      if (existing) {
        setLabel(existing.label);
        setEmoji(existing.emoji);
        setColor(existing.color);
        setContent(existing.content);
      } else {
        setLabel('');
        setEmoji('📋');
        setColor(PRESET_COLORS[0]);
        setContent('');
        // Auto-focus label on add
        setTimeout(() => labelRef.current?.focus(), 300);
      }
    }
  }, [visible, existing]);

  const canSave = label.trim().length > 0 && content.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: existing?.id ?? `snippet_${Date.now()}`,
      label: label.trim(),
      emoji,
      color,
      content: content.trim(),
    });
    onClose();
  };

  const handleDelete = () => {
    if (existing?.id && onDelete) {
      onDelete(existing.id);
      onClose();
    }
  };

  const accentBg = `${color}14`;
  const accentBorder = `${color}40`;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit Snippet' : 'New Snippet'}
      maxHeight="90%"
      paddingHorizontal={16}
      paddingBottom={Platform.OS === 'ios' ? 34 : 20}
      footer={
        <XStack gap={10}>
          {/* Delete (edit mode only) */}
          {isEdit && onDelete && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete snippet"
              onPress={handleDelete}
              style={styles.deleteBtn}
            >
              <LuTrash2 size={15} color={tokens.status.critical.text} />
              <Text fontSize={13} fontWeight="600" color={tokens.status.critical.text}>
                Delete
              </Text>
            </Pressable>
          )}

          {/* Save */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save snippet"
            onPress={handleSave}
            style={[
              styles.saveBtn,
              {
                backgroundColor: canSave ? color : tokens.border,
                flex: 1,
              },
            ]}
            disabled={!canSave}
          >
            <LuCheck size={15} color="#fff" />
            <Text fontSize={13} fontWeight="700" color="#fff">
              {isEdit ? 'Save Changes' : 'Add Snippet'}
            </Text>
          </Pressable>
        </XStack>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={16} paddingBottom={8}>

            {/* Preview pill */}
            <XStack justifyContent="center" paddingVertical={4}>
              <XStack
                height={36}
                borderRadius={tokens.radius.full}
                borderWidth={1}
                borderColor={accentBorder}
                backgroundColor={accentBg}
                paddingHorizontal={14}
                alignItems="center"
                gap={6}
              >
                <Text fontSize={14}>{emoji}</Text>
                <Text fontSize={13} fontWeight="600" color={color}>
                  {label || 'Snippet Label'}
                </Text>
              </XStack>
            </XStack>

            {/* Label Input */}
            <YStack gap={6}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8}>
                LABEL
              </Text>
              <XStack
                borderRadius={tokens.radius.sm}
                borderWidth={1}
                borderColor={tokens.border}
                backgroundColor={tokens.surface}
                paddingHorizontal={12}
                height={42}
                alignItems="center"
              >
                <RNTextInput
                  ref={labelRef}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Address, Payment Details…"
                  placeholderTextColor={tokens.textMuted}
                  maxLength={30}
                  style={[styles.input, { color: tokens.text }]}
                  returnKeyType="next"
                />
              </XStack>
            </YStack>

            {/* Emoji Picker */}
            <YStack gap={8}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8}>
                EMOJI
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {PRESET_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    accessibilityRole="button"
                    accessibilityLabel={`Select emoji ${e}`}
                    onPress={() => setEmoji(e)}
                  >
                    <XStack
                      width={38}
                      height={38}
                      borderRadius={tokens.radius.sm}
                      borderWidth={emoji === e ? 2 : 1}
                      borderColor={emoji === e ? color : tokens.border}
                      backgroundColor={emoji === e ? accentBg : tokens.surface}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize={18}>{e}</Text>
                    </XStack>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            {/* Color Picker */}
            <YStack gap={8}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8}>
                COLOR
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {PRESET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`Select color ${c}`}
                    onPress={() => setColor(c)}
                  >
                    <XStack
                      width={30}
                      height={30}
                      borderRadius={tokens.radius.full}
                      backgroundColor={c}
                      borderWidth={color === c ? 3 : 1.5}
                      borderColor={color === c ? tokens.text : `${c}60`}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {color === c && <LuCheck size={13} color="#fff" />}
                    </XStack>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            {/* Content Textarea */}
            <YStack gap={6}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8}>
                CONTENT
              </Text>
              <XStack
                borderRadius={tokens.radius.sm}
                borderWidth={1}
                borderColor={tokens.border}
                backgroundColor={tokens.surface}
                paddingHorizontal={12}
                paddingVertical={10}
                minHeight={120}
              >
                <RNTextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="Enter the message to copy…"
                  placeholderTextColor={tokens.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.textArea, { color: tokens.text }]}
                />
              </XStack>
              <Text fontSize={10} color={tokens.textMuted} textAlign="right">
                {content.length} chars
              </Text>
            </YStack>

          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  textArea: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 100,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
});
