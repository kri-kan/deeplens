import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuRotateCw,
  LuRotateCcw,
  LuSparkles,
  LuSave,
  LuCrop,
  LuCheck,
  LuShield,
  LuSliders,
  LuLayers,
} from '../../icons/lu';
import { useTheme } from '@/theme';
import {
  TransformRecipe,
  DEFAULT_RECIPE,
  getLensProofPreset,
  loadHtmlImage,
  renderCanvasTransform,
  canvasToBlob,
} from '@/utils/MediaCanvasEngine';
import { StoreCurationMediaItem } from './types';

export interface MediaEditorModalProps {
  visible: boolean;
  mediaItem: StoreCurationMediaItem | null;
  productCode?: string;
  brandName?: string;
  onClose: () => void;
  onSave: (blob: Blob, recipe: TransformRecipe) => Promise<void>;
}

export function MediaEditorModal({
  visible,
  mediaItem,
  productCode = 'PROD',
  brandName = 'VAYYARI',
  onClose,
  onSave,
}: MediaEditorModalProps) {
  const { tokens } = useTheme();

  // Recipe state
  const [recipe, setRecipe] = useState<TransformRecipe>(DEFAULT_RECIPE);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [loadingImg, setLoadingImg] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'transform' | 'watermark' | 'presets'>('transform');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize or restore recipe when media item opens
  useEffect(() => {
    if (!visible || !mediaItem) {
      setSourceImg(null);
      setPreviewDataUrl(null);
      return;
    }

    // Restore existing recipe if present, otherwise default
    if (mediaItem.transformRecipe && typeof mediaItem.transformRecipe === 'object') {
      setRecipe({ ...DEFAULT_RECIPE, ...mediaItem.transformRecipe });
    } else {
      setRecipe({
        ...DEFAULT_RECIPE,
        watermark: {
          ...DEFAULT_RECIPE.watermark!,
          text: brandName,
        },
      });
    }

    const imgUrl = mediaItem.originalUri || mediaItem.uri;
    setLoadingImg(true);

    loadHtmlImage(imgUrl)
      .then((img) => {
        setSourceImg(img);
        setLoadingImg(false);
      })
      .catch((err) => {
        console.warn('Failed to load image for canvas editing:', err);
        setLoadingImg(false);
      });
  }, [visible, mediaItem, brandName]);

  // Update canvas preview whenever recipe or source image changes
  const updatePreview = useCallback(() => {
    if (!sourceImg) return;
    try {
      const renderedCanvas = renderCanvasTransform(sourceImg, recipe, 1024);
      canvasRef.current = renderedCanvas;
      const dataUrl = renderedCanvas.toDataURL('image/jpeg', 0.85);
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.warn('Error rendering canvas transform preview:', err);
    }
  }, [sourceImg, recipe]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Quick Action: 1-Tap Lens-Proof Preset
  const handleApplyLensProof = () => {
    const lensProof = getLensProofPreset(brandName);
    setRecipe(lensProof);
  };

  // Quick Action: Rotate 90
  const handleRotate90 = (delta: number) => {
    setRecipe((prev) => ({
      ...prev,
      rotateDegrees: (prev.rotateDegrees + delta + 360) % 360,
    }));
  };

  // Quick Action: Flip Horizontal
  const handleToggleFlipH = () => {
    setRecipe((prev) => ({
      ...prev,
      flipH: !prev.flipH,
    }));
  };

  // Quick Action: Flip Vertical
  const handleToggleFlipV = () => {
    setRecipe((prev) => ({
      ...prev,
      flipV: !prev.flipV,
    }));
  };

  // Quick Action: Crop Aspect Ratios
  const handleSetAspectRatio = (ratio: '4:5' | '1:1' | '3:4' | 'free') => {
    setRecipe((prev) => {
      let cropRect = { x: 0, y: 0, width: 1, height: 1, aspectRatio: ratio };
      if (ratio === '4:5') {
        cropRect = { x: 0.05, y: 0.02, width: 0.9, height: 0.96, aspectRatio: '4:5' };
      } else if (ratio === '1:1') {
        cropRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8, aspectRatio: '1:1' };
      } else if (ratio === '3:4') {
        cropRect = { x: 0.04, y: 0.03, width: 0.92, height: 0.94, aspectRatio: '3:4' };
      }
      return { ...prev, crop: cropRect };
    });
  };

  // Save handler: render at full resolution and export WebP
  const handleSave = async () => {
    if (!sourceImg) return;
    try {
      setSaving(true);
      // Render at up to 2400px for pristine storefront master
      const fullCanvas = renderCanvasTransform(sourceImg, recipe, 2400);
      const blob = await canvasToBlob(fullCanvas, 0.88);
      await onSave(blob, recipe);
      onClose();
    } catch (err) {
      console.error('Failed to export and save modified media:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: tokens.surface }]}>
          {/* Header */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={16}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack alignItems="center" gap={10}>
              <View style={[styles.headerIconCircle, { backgroundColor: `${tokens.accent}14` }]}>
                <LuShield size={18} color={tokens.accent} />
              </View>
              <YStack gap={2}>
                <Text fontSize={16} fontWeight="900" color={tokens.text}>
                  Anti-Lens Media Studio
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  {productCode} • Client-Side Precision Editing
                </Text>
              </YStack>
            </XStack>

            <XStack alignItems="center" gap={8}>
              <Pressable
                onPress={handleApplyLensProof}
                style={[styles.presetHeroBtn, { backgroundColor: '#F59E0B' }]}
              >
                <LuSparkles size={14} color="#FFFFFF" />
                <Text fontSize={12} fontWeight="900" color="#FFFFFF">
                  Lens-Proof (1-Tap)
                </Text>
              </Pressable>

              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <LuX size={20} color={tokens.textMuted} />
              </Pressable>
            </XStack>
          </XStack>

          {/* Body Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Visual Canvas Preview Stage */}
            <View style={styles.previewStage}>
              {loadingImg ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={tokens.accent} />
                  <Text fontSize={12} color={tokens.textMuted} marginTop={8}>
                    Loading image into GPU canvas...
                  </Text>
                </View>
              ) : previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDataUrl}
                  alt="Transformed Preview"
                  style={styles.htmlPreviewImg}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <Text fontSize={12} color={tokens.textMuted}>
                    Ready to transform
                  </Text>
                </View>
              )}

              {/* Status Badges Overlay */}
              <XStack position="absolute" top={12} left={12} gap={6} flexWrap="wrap">
                {recipe.flipH && (
                  <View style={styles.appliedBadge}>
                    <Text fontSize={10} fontWeight="800" color="#FFFFFF">
                      ⇄ Flipped H
                    </Text>
                  </View>
                )}
                {(recipe.tiltAngleX !== 0 || recipe.tiltAngleY !== 0) && (
                  <View style={[styles.appliedBadge, { backgroundColor: '#8B5CF6' }]}>
                    <Text fontSize={10} fontWeight="800" color="#FFFFFF">
                      📐 Tilt {recipe.tiltAngleX}°
                    </Text>
                  </View>
                )}
                {recipe.watermark?.enabled && (
                  <View style={[styles.appliedBadge, { backgroundColor: '#D4AF37' }]}>
                    <Text fontSize={10} fontWeight="800" color="#000000">
                      ✦ Watermarked
                    </Text>
                  </View>
                )}
              </XStack>
            </View>

            {/* Editing Category Tabs */}
            <XStack
              backgroundColor={tokens.background}
              borderRadius={10}
              padding={4}
              gap={4}
              marginTop={16}
            >
              <Pressable
                onPress={() => setActiveTab('transform')}
                style={[
                  styles.tabBtn,
                  activeTab === 'transform' && { backgroundColor: tokens.surface, shadowOpacity: 0.1 },
                ]}
              >
                <LuCrop size={14} color={activeTab === 'transform' ? tokens.accent : tokens.textMuted} />
                <Text
                  fontSize={12}
                  fontWeight={activeTab === 'transform' ? '800' : '600'}
                  color={activeTab === 'transform' ? tokens.text : tokens.textMuted}
                >
                  Transform &amp; Crop
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('watermark')}
                style={[
                  styles.tabBtn,
                  activeTab === 'watermark' && { backgroundColor: tokens.surface, shadowOpacity: 0.1 },
                ]}
              >
                <LuLayers size={14} color={activeTab === 'watermark' ? tokens.accent : tokens.textMuted} />
                <Text
                  fontSize={12}
                  fontWeight={activeTab === 'watermark' ? '800' : '600'}
                  color={activeTab === 'watermark' ? tokens.text : tokens.textMuted}
                >
                  Brand Watermark
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('presets')}
                style={[
                  styles.tabBtn,
                  activeTab === 'presets' && { backgroundColor: tokens.surface, shadowOpacity: 0.1 },
                ]}
              >
                <LuSliders size={14} color={activeTab === 'presets' ? tokens.accent : tokens.textMuted} />
                <Text
                  fontSize={12}
                  fontWeight={activeTab === 'presets' ? '800' : '600'}
                  color={activeTab === 'presets' ? tokens.text : tokens.textMuted}
                >
                  Fine Tilt (Anti-Lens)
                </Text>
              </Pressable>
            </XStack>

            {/* TAB 1: TRANSFORM & CROP */}
            {activeTab === 'transform' && (
              <YStack gap={14} marginTop={16}>
                {/* Rotate & Flip Buttons */}
                <XStack gap={10} flexWrap="wrap">
                  <Pressable
                    onPress={() => handleRotate90(-90)}
                    style={[styles.toolBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                  >
                    <LuRotateCcw size={16} color={tokens.text} />
                    <Text fontSize={12} fontWeight="700" color={tokens.text}>
                      Rotate -90°
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleRotate90(90)}
                    style={[styles.toolBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                  >
                    <LuRotateCw size={16} color={tokens.text} />
                    <Text fontSize={12} fontWeight="700" color={tokens.text}>
                      Rotate +90°
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleToggleFlipH}
                    style={[
                      styles.toolBtn,
                      {
                        borderColor: recipe.flipH ? tokens.accent : tokens.border,
                        backgroundColor: recipe.flipH ? `${tokens.accent}14` : tokens.surface,
                      },
                    ]}
                  >
                    <Text fontSize={14} color={recipe.flipH ? tokens.accent : tokens.text}>
                      ⇄
                    </Text>
                    <Text fontSize={12} fontWeight="700" color={recipe.flipH ? tokens.accent : tokens.text}>
                      Flip Horizontal
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleToggleFlipV}
                    style={[
                      styles.toolBtn,
                      {
                        borderColor: recipe.flipV ? tokens.accent : tokens.border,
                        backgroundColor: recipe.flipV ? `${tokens.accent}14` : tokens.surface,
                      },
                    ]}
                  >
                    <Text fontSize={14} color={recipe.flipV ? tokens.accent : tokens.text}>
                      ⇅
                    </Text>
                    <Text fontSize={12} fontWeight="700" color={recipe.flipV ? tokens.accent : tokens.text}>
                      Flip Vertical
                    </Text>
                  </Pressable>
                </XStack>

                {/* Aspect Ratio Presets */}
                <YStack gap={6}>
                  <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                    Storefront Crop Ratio
                  </Text>
                  <XStack gap={8} flexWrap="wrap">
                    {[
                      { id: '4:5', label: '4:5 Portrait (Store Standard)' },
                      { id: '1:1', label: '1:1 Square (Instagram/Grid)' },
                      { id: '3:4', label: '3:4 Catalog' },
                      { id: 'free', label: 'Unconstrained' },
                    ].map((opt) => {
                      const isSelected = (recipe.crop?.aspectRatio || 'free') === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => handleSetAspectRatio(opt.id as any)}
                          style={[
                            styles.chipBtn,
                            {
                              borderColor: isSelected ? tokens.accent : tokens.border,
                              backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surface,
                            },
                          ]}
                        >
                          <Text
                            fontSize={12}
                            fontWeight={isSelected ? '800' : '600'}
                            color={isSelected ? tokens.accent : tokens.text}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </XStack>
                </YStack>
              </YStack>
            )}

            {/* TAB 2: WATERMARK */}
            {activeTab === 'watermark' && (
              <YStack gap={14} marginTop={16}>
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack gap={2}>
                    <Text fontSize={13} fontWeight="800" color={tokens.text}>
                      Brand Watermark Overlay
                    </Text>
                    <Text fontSize={11} color={tokens.textMuted}>
                      Protects proprietary catalog photos from competitor scraping.
                    </Text>
                  </YStack>

                  <Pressable
                    onPress={() =>
                      setRecipe((prev) => ({
                        ...prev,
                        watermark: {
                          ...prev.watermark!,
                          enabled: !prev.watermark?.enabled,
                        },
                      }))
                    }
                    style={[
                      styles.togglePill,
                      {
                        backgroundColor: recipe.watermark?.enabled ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                      {recipe.watermark?.enabled ? 'ACTIVE' : 'OFF'}
                    </Text>
                  </Pressable>
                </XStack>

                {recipe.watermark?.enabled && (
                  <YStack gap={12}>
                    {/* Brand Text Input */}
                    <YStack gap={4}>
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                        Watermark Brand Text
                      </Text>
                      <TextInput
                        value={recipe.watermark.text}
                        onChangeText={(t) =>
                          setRecipe((prev) => ({
                            ...prev,
                            watermark: { ...prev.watermark!, text: t },
                          }))
                        }
                        placeholder="e.g. VAYYARI"
                        style={[
                          styles.textInput,
                          { borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.background },
                        ]}
                      />
                    </YStack>

                    {/* Presets */}
                    <YStack gap={6}>
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                        Placement Style
                      </Text>
                      <XStack gap={8} flexWrap="wrap">
                        {[
                          { id: 'corner-bottom-right', label: 'Bottom-Right Emblem' },
                          { id: 'corner-bottom-left', label: 'Bottom-Left Emblem' },
                          { id: 'center-emboss', label: 'Center Subtle Stamp' },
                          { id: 'diagonal-tile', label: 'Diagonal Tiled Watermark' },
                        ].map((p) => {
                          const isSel = recipe.watermark?.preset === p.id;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() =>
                                setRecipe((prev) => ({
                                  ...prev,
                                  watermark: { ...prev.watermark!, preset: p.id as any },
                                }))
                              }
                              style={[
                                styles.chipBtn,
                                {
                                  borderColor: isSel ? tokens.accent : tokens.border,
                                  backgroundColor: isSel ? `${tokens.accent}14` : tokens.surface,
                                },
                              ]}
                            >
                              <Text
                                fontSize={12}
                                fontWeight={isSel ? '800' : '600'}
                                color={isSel ? tokens.accent : tokens.text}
                              >
                                {p.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </XStack>
                    </YStack>

                    {/* Opacity Selector */}
                    <YStack gap={6}>
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                        Opacity: {Math.round((recipe.watermark?.opacity || 0.65) * 100)}%
                      </Text>
                      <XStack gap={8}>
                        {[0.35, 0.5, 0.65, 0.8, 0.95].map((op) => {
                          const isSel = Math.abs((recipe.watermark?.opacity || 0.65) - op) < 0.05;
                          return (
                            <Pressable
                              key={op}
                              onPress={() =>
                                setRecipe((prev) => ({
                                  ...prev,
                                  watermark: { ...prev.watermark!, opacity: op },
                                }))
                              }
                              style={[
                                styles.chipBtn,
                                {
                                  borderColor: isSel ? tokens.accent : tokens.border,
                                  backgroundColor: isSel ? `${tokens.accent}14` : tokens.surface,
                                },
                              ]}
                            >
                              <Text
                                fontSize={11}
                                fontWeight={isSel ? '800' : '600'}
                                color={isSel ? tokens.accent : tokens.text}
                              >
                                {Math.round(op * 100)}%
                              </Text>
                            </Pressable>
                          );
                        })}
                      </XStack>
                    </YStack>
                  </YStack>
                )}
              </YStack>
            )}

            {/* TAB 3: FINE TILT (ANTI-LENS WEAPON) */}
            {activeTab === 'presets' && (
              <YStack gap={14} marginTop={16}>
                <View style={[styles.infoBanner, { backgroundColor: '#FDF4FF', borderColor: '#E879F9' }]}>
                  <LuSparkles size={16} color="#A855F7" />
                  <Text fontSize={11} color="#6B21A8" flex={1} lineHeight={16}>
                    Perspective shear alters the geometric distance matrix of SIFT/ORB keypoints. A 3° to 5° tilt makes it statistically impossible for Google Lens to match the original supplier photo.
                  </Text>
                </View>

                {/* Tilt X Angle */}
                <YStack gap={6}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    Perspective Tilt X: {recipe.tiltAngleX > 0 ? `+${recipe.tiltAngleX}°` : `${recipe.tiltAngleX}°`}
                  </Text>
                  <XStack gap={6} flexWrap="wrap">
                    {[-6, -3.5, 0, 3.5, 6].map((deg) => {
                      const isSel = recipe.tiltAngleX === deg;
                      return (
                        <Pressable
                          key={deg}
                          onPress={() => setRecipe((prev) => ({ ...prev, tiltAngleX: deg }))}
                          style={[
                            styles.chipBtn,
                            {
                              borderColor: isSel ? tokens.accent : tokens.border,
                              backgroundColor: isSel ? `${tokens.accent}14` : tokens.surface,
                            },
                          ]}
                        >
                          <Text
                            fontSize={12}
                            fontWeight={isSel ? '800' : '600'}
                            color={isSel ? tokens.accent : tokens.text}
                          >
                            {deg === 0 ? '0° (Flat)' : `${deg > 0 ? `+${deg}` : deg}°`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </XStack>
                </YStack>

                {/* Tilt Y Angle */}
                <YStack gap={6}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    Perspective Tilt Y: {recipe.tiltAngleY > 0 ? `+${recipe.tiltAngleY}°` : `${recipe.tiltAngleY}°`}
                  </Text>
                  <XStack gap={6} flexWrap="wrap">
                    {[-4, -2, 0, 2, 4].map((deg) => {
                      const isSel = recipe.tiltAngleY === deg;
                      return (
                        <Pressable
                          key={deg}
                          onPress={() => setRecipe((prev) => ({ ...prev, tiltAngleY: deg }))}
                          style={[
                            styles.chipBtn,
                            {
                              borderColor: isSel ? tokens.accent : tokens.border,
                              backgroundColor: isSel ? `${tokens.accent}14` : tokens.surface,
                            },
                          ]}
                        >
                          <Text
                            fontSize={12}
                            fontWeight={isSel ? '800' : '600'}
                            color={isSel ? tokens.accent : tokens.text}
                          >
                            {deg === 0 ? '0° (Flat)' : `${deg > 0 ? `+${deg}` : deg}°`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </XStack>
                </YStack>
              </YStack>
            )}
          </ScrollView>

          {/* Footer Save & Apply */}
          <XStack
            paddingHorizontal={20}
            paddingVertical={14}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            alignItems="center"
            justifyContent="space-between"
            backgroundColor={tokens.surface}
          >
            <Pressable onPress={onClose} style={styles.cancelFooterBtn}>
              <Text fontSize={13} fontWeight="700" color={tokens.textMuted}>
                Discard
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving || !sourceImg}
              style={[
                styles.saveFooterBtn,
                { backgroundColor: tokens.accent, opacity: saving || !sourceImg ? 0.6 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <LuCheck size={16} color="#FFFFFF" />
                  <Text fontSize={13} fontWeight="800" color="#FFFFFF">
                    Apply &amp; Save to Storefront
                  </Text>
                </>
              )}
            </Pressable>
          </XStack>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  previewStage: {
    width: '100%',
    height: 340,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  htmlPreviewImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  } as any,
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
