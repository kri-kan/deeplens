import React, { useState, useMemo } from 'react';
import { ScrollView, TextInput, Pressable, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSearch,
  LuX,
  LuPlus,
  LuCopy,
  LuCheck,
  LuArrowLeft,
  LuClock,
  LuSparkles,
  LuTrash2,
} from 'react-icons/lu';
import { useTheme } from '../../theme';

export interface StorybookSnippet {
  id: string;
  label: string;
  emoji: string;
  color: string;
  content: string;
  lastCopiedAt?: number;
}

export const SEEDED_STORYBOOK_SNIPPETS: StorybookSnippet[] = [
  {
    id: '1',
    label: 'Address',
    emoji: '📍',
    color: '#10B981',
    content: 'Vayyari Fashions, 42 Silk Board Lane, HSR Layout Sector 5, Bengaluru, KA 560102',
    lastCopiedAt: Date.now() - 1000 * 60 * 12,
  },
  {
    id: '2',
    label: 'Payment Details',
    emoji: '💳',
    color: '#3B82F6',
    content: 'UPI ID: vayyari@icici | GPay/PhonePe: 9876543210 | HDFC A/C: 50100234567890 (IFSC: HDFC0001234)',
    lastCopiedAt: Date.now() - 1000 * 60 * 45,
  },
  {
    id: '3',
    label: 'Return Policy',
    emoji: '↩️',
    color: '#F59E0B',
    content: 'Easy 7-day return policy. Product must be unwashed, with original tags intact. Unboxing video required for claim.',
  },
  {
    id: '4',
    label: 'COD Details',
    emoji: '📦',
    color: '#8B5CF6',
    content: 'Cash on Delivery available for orders up to ₹5,000. Flat COD fee ₹50. Verification OTP will be sent prior to dispatch.',
  },
  {
    id: '5',
    label: 'Damage Policy',
    emoji: '⚠️',
    color: '#F43F5E',
    content: 'In case of transit damage, report within 24 hours of delivery with 360-degree unboxing video to support@vayyari.com.',
  },
];

export interface UtilitiesHubPageProps {
  disableSafeArea?: boolean;
  onBack?: () => void;
}

export function UtilitiesHubPage({ disableSafeArea = false, onBack }: UtilitiesHubPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [snippets, setSnippets] = useState<StorybookSnippet[]>(SEEDED_STORYBOOK_SNIPPETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit/Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<StorybookSnippet | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formEmoji, setFormEmoji] = useState('📌');
  const [formColor, setFormColor] = useState('#10B981');
  const [formContent, setFormContent] = useState('');

  const filteredSnippets = useMemo(() => {
    if (!searchQuery.trim()) return snippets;
    const q = searchQuery.toLowerCase();
    return snippets.filter(
      (s) => s.label.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [snippets, searchQuery]);

  const recentCopies = useMemo(() => {
    return snippets
      .filter((s) => s.lastCopiedAt)
      .sort((a, b) => (b.lastCopiedAt || 0) - (a.lastCopiedAt || 0))
      .slice(0, 3);
  }, [snippets]);

  const handleCopy = (snippet: StorybookSnippet) => {
    setCopiedId(snippet.id);
    setToastMessage(`Copied "${snippet.label}" to clipboard!`);
    setSnippets((prev) =>
      prev.map((s) => (s.id === snippet.id ? { ...s, lastCopiedAt: Date.now() } : s))
    );
    setTimeout(() => {
      setCopiedId(null);
      setToastMessage(null);
    }, 2000);
  };

  const handleOpenAdd = () => {
    setEditingSnippet(null);
    setFormLabel('');
    setFormEmoji('📌');
    setFormColor('#10B981');
    setFormContent('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (snippet: StorybookSnippet) => {
    setEditingSnippet(snippet);
    setFormLabel(snippet.label);
    setFormEmoji(snippet.emoji);
    setFormColor(snippet.color);
    setFormContent(snippet.content);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formLabel.trim() || !formContent.trim()) return;
    if (editingSnippet) {
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === editingSnippet.id
            ? { ...s, label: formLabel, emoji: formEmoji, color: formColor, content: formContent }
            : s
        )
      );
      setToastMessage(`Updated "${formLabel}"`);
    } else {
      const newSnippet: StorybookSnippet = {
        id: Date.now().toString(),
        label: formLabel,
        emoji: formEmoji,
        color: formColor,
        content: formContent,
      };
      setSnippets((prev) => [...prev, newSnippet]);
      setToastMessage(`Added "${formLabel}" chip`);
    }
    setIsModalOpen(false);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleDelete = () => {
    if (!editingSnippet) return;
    setSnippets((prev) => prev.filter((s) => s.id !== editingSnippet.id));
    setIsModalOpen(false);
    setToastMessage(`Deleted "${editingSnippet.label}"`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <XStack
          position="absolute"
          top={topInset + 56}
          alignSelf="center"
          zIndex={999}
          backgroundColor={tokens.accent}
          paddingVertical={8}
          paddingHorizontal={16}
          borderRadius={tokens.radius.full}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.2}
          shadowRadius={8}
          alignItems="center"
          gap={6}
        >
          <LuCheck size={14} color="#FFF" />
          <Text fontSize={12} fontWeight="700" color="#FFF">
            {toastMessage}
          </Text>
        </XStack>
      )}

      {/* Top Header */}
      <XStack
        paddingTop={topInset}
        height={52 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={14}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={10}>
          {onBack && (
            <Pressable onPress={onBack} style={{ cursor: 'pointer' } as any}>
              <XStack padding={6} borderRadius={tokens.radius.full} backgroundColor={tokens.surfaceRaised}>
                <LuArrowLeft size={18} color={tokens.text} />
              </XStack>
            </Pressable>
          )}
          <YStack gap={1}>
            <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
              Utilities Hub
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              Operational messages & address copiers
            </Text>
          </YStack>
        </XStack>

        <XStack
          paddingVertical={4}
          paddingHorizontal={10}
          borderRadius={tokens.radius.full}
          backgroundColor={`${tokens.accent}14`}
          borderWidth={1}
          borderColor={`${tokens.accent}30`}
          alignItems="center"
          gap={4}
        >
          <LuSparkles size={13} color={tokens.accent} />
          <Text fontSize={11} fontWeight="700" color={tokens.accent}>
            Admin Copier
          </Text>
        </XStack>
      </XStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: Math.max(24, bottomInset + 16),
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <XStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.sm}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal={10}
          height={38}
          alignItems="center"
          gap={6}
        >
          <LuSearch size={15} color={tokens.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search snippets (address, UPI, policy)..."
            placeholderTextColor={tokens.textMuted}
            style={{
              flex: 1,
              fontSize: 12,
              color: tokens.text,
              outlineStyle: 'none',
            } as any}
          />
          {searchQuery.trim().length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={{ cursor: 'pointer' } as any}>
              <XStack padding={3} borderRadius={tokens.radius.full} backgroundColor={tokens.surfaceRaised}>
                <LuX size={11} color={tokens.textMuted} />
              </XStack>
            </Pressable>
          )}
        </XStack>

        {/* Section 1: Snippet Chips (Uncontained Edge-to-Edge) */}
        <YStack gap={10}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={1.2}>
              COPY SNIPPETS
            </Text>
          </XStack>

          <XStack flexWrap="wrap" gap={8}>
            {/* Add Chip */}
            <Pressable onPress={handleOpenAdd} style={{ cursor: 'pointer' } as any}>
              <XStack
                height={34}
                paddingHorizontal={12}
                borderRadius={tokens.radius.full}
                backgroundColor={`${tokens.accent}12`}
                borderWidth={1.5}
                borderStyle="dashed"
                borderColor={`${tokens.accent}50`}
                alignItems="center"
                justifyContent="center"
                gap={5}
              >
                <LuPlus size={14} color={tokens.accent} />
                <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                  Add
                </Text>
              </XStack>
            </Pressable>

            {/* Render Snippet Chips */}
            {filteredSnippets.map((item) => {
              const isCopied = copiedId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleCopy(item)}
                  onLongPress={() => handleOpenEdit(item)}
                  style={{ cursor: 'pointer' } as any}
                >
                  <XStack
                    height={34}
                    paddingHorizontal={12}
                    borderRadius={tokens.radius.full}
                    backgroundColor={isCopied ? `${item.color}33` : `${item.color}14`}
                    borderWidth={1}
                    borderColor={isCopied ? item.color : `${item.color}40`}
                    alignItems="center"
                    gap={6}
                  >
                    <Text fontSize={13}>{item.emoji}</Text>
                    <Text fontSize={12} fontWeight="700" color={tokens.text}>
                      {item.label}
                    </Text>
                    {isCopied ? (
                      <LuCheck size={13} color={item.color} />
                    ) : (
                      <LuCopy size={12} color={`${tokens.text}60`} />
                    )}
                  </XStack>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>

        {/* Section 2: Recent Copies Log */}
        {recentCopies.length > 0 && (
          <YStack gap={10} marginTop={8}>
            <XStack alignItems="center" gap={6}>
              <LuClock size={14} color={tokens.textMuted} />
              <Text fontSize={13} fontWeight="700" color={tokens.text} letterSpacing={0.3}>
                RECENTLY COPIED
              </Text>
            </XStack>

            <YStack gap={8}>
              {recentCopies.map((item) => (
                <Pressable key={item.id} onPress={() => handleCopy(item)} style={{ cursor: 'pointer' } as any}>
                  <YStack
                    padding={12}
                    borderRadius={tokens.radius.md}
                    backgroundColor={tokens.surface}
                    borderWidth={1}
                    borderColor={tokens.border}
                    gap={6}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={14}>{item.emoji}</Text>
                        <Text fontSize={13} fontWeight="700" color={tokens.text}>
                          {item.label}
                        </Text>
                      </XStack>
                      <XStack alignItems="center" gap={4}>
                        <LuCopy size={12} color={tokens.accent} />
                        <Text fontSize={11} fontWeight="600" color={tokens.accent}>
                          Tap to recopy
                        </Text>
                      </XStack>
                    </XStack>
                    <Text fontSize={12} color={tokens.textMuted} numberOfLines={2}>
                      {item.content}
                    </Text>
                  </YStack>
                </Pressable>
              ))}
            </YStack>
          </YStack>
        )}
      </ScrollView>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
        >
          <YStack
            backgroundColor={tokens.surface}
            borderTopLeftRadius={tokens.radius.lg}
            borderTopRightRadius={tokens.radius.lg}
            padding={16}
            gap={14}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={16} fontWeight="800" color={tokens.text}>
                {editingSnippet ? `Edit "${editingSnippet.label}"` : 'Add New Utility Snippet'}
              </Text>
              <Pressable onPress={() => setIsModalOpen(false)} style={{ cursor: 'pointer' } as any}>
                <LuX size={18} color={tokens.textMuted} />
              </Pressable>
            </XStack>

            <YStack gap={6}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                CHIP LABEL & EMOJI
              </Text>
              <XStack gap={8}>
                <TextInput
                  value={formEmoji}
                  onChangeText={setFormEmoji}
                  maxLength={2}
                  style={{
                    width: 44,
                    height: 40,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.surfaceRaised,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    textAlign: 'center',
                    fontSize: 18,
                  } as any}
                />
                <TextInput
                  value={formLabel}
                  onChangeText={setFormLabel}
                  placeholder="Snippet Label (e.g. Return Policy)"
                  placeholderTextColor={tokens.textMuted}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.surfaceRaised,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    paddingHorizontal: 12,
                    fontSize: 13,
                    color: tokens.text,
                  } as any}
                />
              </XStack>
            </YStack>

            <YStack gap={6}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                SNIPPET CONTENT (TO COPY)
              </Text>
              <TextInput
                value={formContent}
                onChangeText={setFormContent}
                multiline
                numberOfLines={3}
                placeholder="Enter text content to copy..."
                placeholderTextColor={tokens.textMuted}
                style={{
                  minHeight: 80,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.surfaceRaised,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  padding: 12,
                  fontSize: 12,
                  color: tokens.text,
                  textAlignVertical: 'top',
                } as any}
              />
            </YStack>

            <XStack gap={10} marginTop={8}>
              {editingSnippet && (
                <Pressable onPress={handleDelete} style={{ cursor: 'pointer', flex: 1 } as any}>
                  <XStack
                    height={42}
                    borderRadius={tokens.radius.sm}
                    backgroundColor="#F43F5E18"
                    borderWidth={1}
                    borderColor="#F43F5E40"
                    alignItems="center"
                    justifyContent="center"
                    gap={6}
                  >
                    <LuTrash2 size={16} color="#F43F5E" />
                    <Text fontSize={13} fontWeight="700" color="#F43F5E">
                      Delete
                    </Text>
                  </XStack>
                </Pressable>
              )}
              <Pressable onPress={handleSave} style={{ cursor: 'pointer', flex: 2 } as any}>
                <XStack
                  height={42}
                  borderRadius={tokens.radius.sm}
                  backgroundColor={tokens.accent}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={13} fontWeight="800" color="#FFF">
                    Save Snippet
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          </YStack>
        </View>
      )}
    </YStack>
  );
}
