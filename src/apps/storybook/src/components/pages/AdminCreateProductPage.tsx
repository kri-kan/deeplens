import React, { useState } from 'react';
import {
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuSparkles,
  LuPlus,
  LuTrash2,
  LuCheck,
  LuX,
  LuLink,
  LuImage,
  LuVideo,
  LuTriangleAlert,
  LuRefreshCw,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import { OptionChip } from '../atoms/OptionChip/OptionChip';

export interface StagedMediaItem {
  id: string;
  uri: string;
  mediaType?: 'image' | 'video';
  isPrimary?: boolean;
  fileName?: string;
  aspectRatio?: string;
}

export interface LinkedInstagramPostItem {
  id: string;
  thumbnailUrl?: string;
  permalink?: string;
  captionSnippet?: string;
  productCode?: string; // If already linked to another product
}

export interface ProductCategoryOption {
  id: string;
  label: string;
  iconName?: string;
}

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: 'saree', label: 'Saree' },
  { id: 'dress', label: 'Dress' },
  { id: 'lehanga', label: 'Lehanga' },
  { id: 'kids', label: 'Kids' },
  { id: 'mens', label: 'Mens' },
  { id: 'others', label: 'Others' },
];

export interface AdminCreateProductFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  media: StagedMediaItem[];
  linkedPosts: LinkedInstagramPostItem[];
}

export interface AdminCreateProductPageProps {
  initialTitle?: string;
  initialDescription?: string;
  initialPrice?: string;
  initialCategory?: string;
  initialMedia?: StagedMediaItem[];
  initialLinkedPosts?: LinkedInstagramPostItem[];
  categories?: ProductCategoryOption[];
  isLoading?: boolean;
  errorMessage?: string;
  isTabletSplit?: boolean;
  disableSafeArea?: boolean;
  onBack?: () => void;
  onPickMedia?: () => void;
  onRemoveMedia?: (id: string) => void;
  onSetPrimaryMedia?: (id: string) => void;
  onLinkInstagramPost?: (url: string) => void;
  onRemoveInstagramPost?: (id: string) => void;
  onAiAutoSuggest?: () => void;
  onSubmit?: (data: AdminCreateProductFormData) => void;
  onCancel?: () => void;
}

export function AdminCreateProductPage({
  initialTitle = '',
  initialDescription = '',
  initialPrice = '',
  initialCategory = 'saree',
  initialMedia = [],
  initialLinkedPosts = [],
  categories = DEFAULT_PRODUCT_CATEGORIES,
  isLoading = false,
  errorMessage = '',
  isTabletSplit = false,
  disableSafeArea = false,
  onBack,
  onPickMedia,
  onRemoveMedia,
  onSetPrimaryMedia,
  onLinkInstagramPost,
  onRemoveInstagramPost,
  onAiAutoSuggest,
  onSubmit,
  onCancel,
}: AdminCreateProductPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [price, setPrice] = useState(initialPrice);
  const [category, setCategory] = useState(initialCategory);
  const [media, setMedia] = useState<StagedMediaItem[]>(initialMedia);
  const [linkedPosts, setLinkedPosts] = useState<LinkedInstagramPostItem[]>(initialLinkedPosts);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [isLinkingPost, setIsLinkingPost] = useState(false);
  const [showIgInput, setShowIgInput] = useState(false);

  // Sync with prop updates if provided
  React.useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);
  React.useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);
  React.useEffect(() => {
    setPrice(initialPrice);
  }, [initialPrice]);
  React.useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);
  React.useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);
  React.useEffect(() => {
    setLinkedPosts(initialLinkedPosts);
  }, [initialLinkedPosts]);

  const handleRemoveMedia = (id: string) => {
    if (onRemoveMedia) {
      onRemoveMedia(id);
    } else {
      setMedia(prev => {
        const filtered = prev.filter(m => m.id !== id);
        if (prev.find(m => m.id === id)?.isPrimary && filtered.length > 0) {
          filtered[0].isPrimary = true;
        }
        return filtered;
      });
    }
  };

  const handleSetPrimary = (id: string) => {
    if (onSetPrimaryMedia) {
      onSetPrimaryMedia(id);
    } else {
      setMedia(prev =>
        prev.map(m => ({
          ...m,
          isPrimary: m.id === id,
        }))
      );
    }
  };

  const handleAddMedia = () => {
    if (onPickMedia) {
      onPickMedia();
    } else {
      const newId = `media-${Date.now()}`;
      setMedia(prev => [
        ...prev,
        {
          id: newId,
          uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
          mediaType: 'image',
          isPrimary: prev.length === 0,
        },
      ]);
    }
  };

  const handleAddInstagramPost = () => {
    if (!instagramUrl.trim()) return;
    if (onLinkInstagramPost) {
      onLinkInstagramPost(instagramUrl.trim());
      setInstagramUrl('');
      setShowIgInput(false);
    } else {
      setIsLinkingPost(true);
      setTimeout(() => {
        const newPost: LinkedInstagramPostItem = {
          id: `ig-${Date.now()}`,
          thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80',
          permalink: instagramUrl,
          captionSnippet: 'Handloom collection reel update #vayyari',
        };
        setLinkedPosts(prev => [...prev, newPost]);
        setInstagramUrl('');
        setShowIgInput(false);
        setIsLinkingPost(false);
      }, 400);
    }
  };

  const handleRemoveInstagramPost = (id: string) => {
    if (onRemoveInstagramPost) {
      onRemoveInstagramPost(id);
    } else {
      setLinkedPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleTriggerAi = () => {
    if (onAiAutoSuggest) {
      onAiAutoSuggest();
    } else {
      setTitle('Handloom Banarasi Mulberry Silk Saree');
      setDescription(
        'Exquisite handwoven Banarasi silk saree featuring intricate zari jaal work, contrast temple borders, and festive grandeur. Comes with unstitched matching blouse piece.'
      );
      setPrice('4850');
      setCategory('saree');
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        title,
        description,
        price,
        category,
        media,
        linkedPosts,
      });
    }
  };

  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 16 : Math.max(insets.bottom, 16);

  // ─────────────────────────────────────────────
  // RENDER SECTIONS
  // ─────────────────────────────────────────────

  // Media Strip / Gallery
  const renderMediaStrip = () => (
    <YStack gap={10} marginBottom={16}>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap={6}>
          <Text fontSize={13} fontWeight="700" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Product Media
          </Text>
          <XStack
            backgroundColor={`${tokens.accent}18`}
            paddingHorizontal={6}
            paddingVertical={2}
            borderRadius={tokens.radius.full}
          >
            <Text fontSize={11} fontWeight="700" color={tokens.accent}>
              {media.length}
            </Text>
          </XStack>
        </XStack>
        {media.length > 0 && (
          <Text fontSize={11} color={tokens.textMuted}>
            Tap thumbnail to set as cover
          </Text>
        )}
      </XStack>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
        {media.map((item, idx) => (
          <Pressable
            key={item.id}
            onPress={() => handleSetPrimary(item.id)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <YStack
              width={100}
              height={130}
              borderRadius={tokens.radius.md}
              overflow="hidden"
              borderWidth={2}
              borderColor={item.isPrimary ? tokens.accent : tokens.border}
              backgroundColor={tokens.surfaceRaised}
              position="relative"
            >
              <Image
                source={{ uri: item.uri }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />

              {/* Cover badge */}
              {item.isPrimary && (
                <XStack
                  position="absolute"
                  top={6}
                  left={6}
                  backgroundColor={tokens.accent}
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={tokens.radius.xs}
                  alignItems="center"
                  gap={3}
                >
                  <LuCheck size={10} color="#ffffff" />
                  <Text fontSize={9} fontWeight="700" color="#ffffff" textTransform="uppercase">
                    Cover
                  </Text>
                </XStack>
              )}

              {/* Video icon badge if video */}
              {item.mediaType === 'video' && (
                <XStack
                  position="absolute"
                  bottom={6}
                  left={6}
                  backgroundColor="rgba(0,0,0,0.65)"
                  paddingHorizontal={5}
                  paddingVertical={3}
                  borderRadius={tokens.radius.xs}
                >
                  <LuVideo size={11} color="#ffffff" />
                </XStack>
              )}

              {/* Delete button */}
              <Pressable
                onPress={() => handleRemoveMedia(item.id)}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LuTrash2 size={11} color="#ffffff" />
              </Pressable>
            </YStack>
          </Pressable>
        ))}

        {/* Add Media Button */}
        <Pressable onPress={handleAddMedia}>
          <YStack
            width={100}
            height={130}
            borderRadius={tokens.radius.md}
            borderWidth={1.5}
            borderStyle="dashed"
            borderColor={tokens.borderStrong}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
            gap={6}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.full}
              backgroundColor={`${tokens.accent}14`}
              alignItems="center"
              justifyContent="center"
            >
              <LuPlus size={18} color={tokens.accent} />
            </XStack>
            <Text fontSize={11} fontWeight="600" color={tokens.textSecondary}>
              Add Media
            </Text>
          </YStack>
        </Pressable>
      </ScrollView>
    </YStack>
  );

  // Category Selector
  const renderCategorySection = () => (
    <YStack gap={8} marginBottom={18}>
      <Text fontSize={13} fontWeight="700" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
        Category <Text color={tokens.error}>*</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map(cat => (
          <OptionChip
            key={cat.id}
            label={cat.label}
            selected={category.toLowerCase() === cat.id.toLowerCase()}
            onSelect={() => setCategory(cat.id)}
          />
        ))}
      </ScrollView>
    </YStack>
  );

  // Core Form Inputs (Title, Price, Description)
  const renderCoreInputs = () => (
    <YStack gap={14} marginBottom={18}>
      {/* Title with AI Sparkle trigger */}
      <YStack gap={6}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} fontWeight="700" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Product Title <Text color={tokens.error}>*</Text>
          </Text>
          <Pressable
            onPress={handleTriggerAi}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            })}
          >
            <LuSparkles size={13} color={tokens.accent} />
            <Text fontSize={12} fontWeight="600" color={tokens.accent}>
              AI Auto-Fill
            </Text>
          </Pressable>
        </XStack>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Designer Banarasi Katan Silk Saree"
          placeholderTextColor={tokens.textMuted}
          style={[
            styles.textInput,
            {
              backgroundColor: tokens.surfaceRaised,
              borderColor: errorMessage && !title ? tokens.error : tokens.border,
              color: tokens.text,
              borderRadius: tokens.radius.sm,
            },
          ]}
        />
      </YStack>

      {/* Price input */}
      <YStack gap={6}>
        <Text fontSize={13} fontWeight="700" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
          Vendor Price (₹)
        </Text>
        <XStack
          alignItems="center"
          backgroundColor={tokens.surfaceRaised}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.sm}
          paddingHorizontal={12}
        >
          <Text fontSize={15} fontWeight="700" color={tokens.textSecondary} marginRight={4}>
            ₹
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor={tokens.textMuted}
            style={[
              styles.textInputFlex,
              {
                color: tokens.text,
              },
            ]}
          />
        </XStack>
      </YStack>

      {/* Description */}
      <YStack gap={6}>
        <Text fontSize={13} fontWeight="700" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Enter fabric specifications, zari craft details, wash care..."
          placeholderTextColor={tokens.textMuted}
          style={[
            styles.textArea,
            {
              backgroundColor: tokens.surfaceRaised,
              borderColor: tokens.border,
              color: tokens.text,
              borderRadius: tokens.radius.sm,
            },
          ]}
        />
      </YStack>
    </YStack>
  );

  // Instagram Link Section
  const renderInstagramSection = () => (
    <YStack gap={10} marginBottom={24}>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap={6}>
          <Text fontSize={13} fontWeight="700" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Linked Instagram Post
          </Text>
          <XStack
            backgroundColor={`${tokens.accent}18`}
            paddingHorizontal={6}
            paddingVertical={2}
            borderRadius={tokens.radius.full}
          >
            <Text fontSize={11} fontWeight="700" color={tokens.accent}>
              {linkedPosts.length}
            </Text>
          </XStack>
        </XStack>
        {!showIgInput && (
          <Pressable
            onPress={() => setShowIgInput(true)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            })}
          >
            <LuPlus size={13} color={tokens.accent} />
            <Text fontSize={12} fontWeight="600" color={tokens.accent}>
              Link Post
            </Text>
          </Pressable>
        )}
      </XStack>

      {/* Linked posts list */}
      {linkedPosts.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {linkedPosts.map(post => {
            const isInvalid = !!post.productCode;
            return (
              <XStack
                key={post.id}
                backgroundColor={tokens.surfaceRaised}
                borderWidth={1}
                borderColor={isInvalid ? tokens.error : tokens.border}
                borderRadius={tokens.radius.sm}
                padding={8}
                alignItems="center"
                gap={8}
                width={200}
              >
                {post.thumbnailUrl ? (
                  <Image
                    source={{ uri: post.thumbnailUrl }}
                    style={{ width: 44, height: 44, borderRadius: tokens.radius.xs }}
                  />
                ) : (
                  <YStack
                    width={44}
                    height={44}
                    borderRadius={tokens.radius.xs}
                    backgroundColor={`${tokens.accent}15`}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <LuLink size={18} color={tokens.accent} />
                  </YStack>
                )}
                <YStack flex={1} gap={2}>
                  <Text fontSize={12} fontWeight="600" color={tokens.text} numberOfLines={1}>
                    {post.permalink || 'Instagram Post'}
                  </Text>
                  {isInvalid ? (
                    <Text fontSize={10} color={tokens.error} fontWeight="700">
                      Linked: {post.productCode}
                    </Text>
                  ) : (
                    <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
                      {post.captionSnippet || 'Verified post source'}
                    </Text>
                  )}
                </YStack>
                <Pressable onPress={() => handleRemoveInstagramPost(post.id)} hitSlop={6}>
                  <LuX size={15} color={tokens.textMuted} />
                </Pressable>
              </XStack>
            );
          })}
        </ScrollView>
      )}

      {/* Input row if open */}
      {showIgInput && (
        <XStack
          gap={8}
          alignItems="center"
          backgroundColor={tokens.surfaceRaised}
          borderWidth={1}
          borderColor={tokens.border}
          borderRadius={tokens.radius.sm}
          paddingHorizontal={10}
          paddingVertical={4}
        >
          <LuLink size={16} color={tokens.textMuted} />
          <TextInput
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            placeholder="Paste reel or post link..."
            placeholderTextColor={tokens.textMuted}
            style={[styles.textInputFlex, { color: tokens.text }]}
          />
          {isLinkingPost ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : (
            <Pressable
              onPress={handleAddInstagramPost}
              disabled={!instagramUrl.trim()}
              style={({ pressed }) => ({
                opacity: pressed || !instagramUrl.trim() ? 0.6 : 1,
                paddingHorizontal: 8,
                paddingVertical: 4,
              })}
            >
              <LuCheck size={18} color={tokens.accent} />
            </Pressable>
          )}
          <Pressable onPress={() => setShowIgInput(false)} hitSlop={6}>
            <LuX size={16} color={tokens.textMuted} />
          </Pressable>
        </XStack>
      )}
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header */}
      <XStack
        paddingTop={topInset + 10}
        paddingBottom={12}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        backgroundColor={tokens.surface}
      >
        <XStack alignItems="center" gap={12}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={10}>
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack>
            <Text fontSize={17} fontWeight="700" color={tokens.text}>
              Add New Product
            </Text>
            <Text fontSize={11} color={tokens.textMuted}>
              Catalog intake & staged intent media
            </Text>
          </YStack>
        </XStack>

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            paddingHorizontal: 8,
            paddingVertical: 4,
          })}
        >
          <Text fontSize={13} fontWeight="600" color={tokens.textSecondary}>
            Clear
          </Text>
        </Pressable>
      </XStack>

      {/* Error banner if present */}
      {errorMessage ? (
        <XStack
          backgroundColor={`${tokens.error}14`}
          borderColor={tokens.error}
          borderWidth={1}
          marginHorizontal={16}
          marginTop={12}
          padding={10}
          borderRadius={tokens.radius.sm}
          alignItems="center"
          gap={8}
        >
          <LuTriangleAlert size={16} color={tokens.error} />
          <Text fontSize={12} fontWeight="600" color={tokens.error} flex={1}>
            {errorMessage}
          </Text>
        </XStack>
      ) : null}

      {/* Body Layout: Tablet Split vs Mobile Single Scroll */}
      {isTabletSplit ? (
        <XStack flex={1} paddingHorizontal={20} paddingTop={16} gap={24}>
          {/* Left Column: Media & Instagram */}
          <YStack flex={1} maxWidth={440}>
            {renderMediaStrip()}
            {renderInstagramSection()}
          </YStack>

          {/* Right Column: Details & Categorization */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {renderCategorySection()}
            {renderCoreInputs()}
          </ScrollView>
        </XStack>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          {renderMediaStrip()}
          {renderCategorySection()}
          {renderCoreInputs()}
          {renderInstagramSection()}
        </ScrollView>
      )}

      {/* Sticky Bottom Action Footer */}
      <XStack
        paddingHorizontal={16}
        paddingTop={12}
        paddingBottom={bottomInset}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        backgroundColor={tokens.surface}
        gap={12}
        alignItems="center"
      >
        <Pressable
          onPress={onCancel}
          disabled={isLoading}
          style={({ pressed }) => ({
            opacity: pressed || isLoading ? 0.7 : 1,
            flex: 1,
            height: 46,
            borderRadius: tokens.radius.sm,
            borderWidth: 1,
            borderColor: tokens.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.surfaceRaised,
          })}
        >
          <Text fontSize={14} fontWeight="700" color={tokens.text}>
            Cancel
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={isLoading || linkedPosts.some(p => p.productCode)}
          style={({ pressed }) => ({
            opacity: pressed || isLoading || linkedPosts.some(p => p.productCode) ? 0.6 : 1,
            flex: 2,
            height: 46,
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <LuPlus size={16} color="#ffffff" />
              <Text fontSize={14} fontWeight="700" color="#ffffff">
                Save & Add Product
              </Text>
            </>
          )}
        </Pressable>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  textInput: {
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textInputFlex: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
