import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal as RNModal,
  PanResponder,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  IconButton,
  useTheme,
  ActivityIndicator,
  Button,
  Portal,
  Dialog,
  Icon,
  Menu,
  Modal,
  Chip,
} from 'react-native-paper';
import { CompactChip } from '@/components/ui/CompactChip';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { productService } from '@/services/productService';
import { useProductDetail } from '@/hooks/useProductDetail';
import type { VendorProduct, MediaEntry, VendorListing } from '@/types/products';
import { downloadMedia, shareMedia } from '@/utils/media-helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

function ActiveVideoPlayer({ videoUrl, isPlaying, style }: {
  videoUrl: string;
  isPlaying: boolean;
  style: any;
}) {
  const player = useVideoPlayer(videoUrl, p => {
    p.loop = false;
  });

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={isPlaying}
      fullscreenOptions={{ enable: true }}
    />
  );
}

// ── Inline video slide rendered in the carousel ──────────────────────────────
function VideoSlide({ media, isActive, onFullscreen, style }: { media: MediaEntry; isActive: boolean; onFullscreen: () => void; style?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = media.id && media.id !== '00000000-0000-0000-0000-000000000000'
    ? productService.getRawMediaUrl(media.id)
    : '';

  const thumbnailUrl = media.id && media.id !== '00000000-0000-0000-0000-000000000000'
    ? productService.getThumbnailUrl(media.id, 'large')
    : null;

  // Reset play state if slide becomes inactive
  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
    }
  }, [isActive]);

  const containerStyle = style || styles.carouselImage;

  if (!videoUrl) {
    return (
      <View style={[containerStyle, styles.center, { backgroundColor: '#111' }]}>
        <Icon source="video-off" size={48} color="#555" />
        <Text style={{ color: '#555', marginTop: 8 }}>Video unavailable</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {isActive && isPlaying ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setIsPlaying(false)} style={containerStyle}>
          <ActiveVideoPlayer videoUrl={videoUrl} isPlaying={isPlaying} style={containerStyle} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setIsPlaying(true)} style={containerStyle}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#000' }]} />
          )}
          <View style={styles.videoOverlay}>
            <View style={styles.playBtn}>
              <Icon source="play-circle" size={48} color="rgba(255,255,255,0.95)" />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const { data: product, isLoading: loading, refetch: fetchProductDetails, setDefaultMedia } = useProductDetail(id);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [previewListing, setPreviewListing] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [shareProgress, setShareProgress] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'carousel' | 'gallery'>('carousel');

  useEffect(() => {
    AsyncStorage.getItem('product-view-preference').then(val => {
      if (val === 'gallery' || val === 'carousel') setViewMode(val as any);
    });
  }, []);

  const toggleViewMode = () => {
    const nextMode = viewMode === 'gallery' ? 'carousel' : 'gallery';
    setViewMode(nextMode);
    AsyncStorage.setItem('product-view-preference', nextMode);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProductDetails();
    }, [fetchProductDetails])
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          setPreviewListing(null);
        }
      },
    })
  ).current;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleReevaluateLLM = async () => {
    if (!product?.id) return;
    try {
      await productService.reevaluateProducts([product.id]);
      Alert.alert('Success', 'LLM Re-evaluation initiated successfully');
      fetchProductDetails();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to initiate LLM re-evaluation');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await productService.deleteProduct(id);
      setIsDeleteDialogOpen(false);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStarMedia = async () => {
    if (!product || !product.media || product.media.length === 0) return;
    const mediaId = product.media[activeMediaIndex].id;
    try {
      await productService.starMedia(id, mediaId);
      // Refresh local state or fetch again
      fetchProductDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to star media');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Product not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  const mediaList = product.media || [];

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: 'transparent', position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }}>
        <Appbar.BackAction onPress={() => router.back()} color="white" style={styles.headerBtn} />
        <Appbar.Content title="" />
        <Appbar.Action 
          icon="call-merge" 
          color="white" 
          style={styles.headerBtn}
          onPress={() => {
            router.push({
              pathname: '/utilities/product/product-similar-matches',
              params: { productId: id, productTitle: product.title || '' },
            } as any);
          }} 
        />
        <Appbar.Action 
          icon={viewMode === 'gallery' ? 'view-carousel' : 'view-grid'} 
          color="white" 
          style={styles.headerBtn}
          onPress={toggleViewMode} 
        />
        <Menu
          visible={isMenuOpen}
          onDismiss={() => setIsMenuOpen(false)}
          anchor={
            <Appbar.Action icon="dots-vertical" onPress={() => setIsMenuOpen(true)} color="white" style={styles.headerBtn} />
          }
        >
          <Menu.Item
            onPress={() => {
              setIsMenuOpen(false);
              router.push(`/product/${id}/share`);
            }}
            title="Share Product"
            leadingIcon="share-variant"
          />
          <Menu.Item
            onPress={() => {
              setIsMenuOpen(false);
              handleStarMedia();
            }}
            title="Star Current Image"
            leadingIcon="star-outline"
          />
          <Menu.Item
            onPress={() => {
              setIsMenuOpen(false);
              handleReevaluateLLM();
            }}
            title="Re-evaluate with LLM"
            leadingIcon="robot-outline"
          />
          <Menu.Item
            onPress={() => {
              setIsMenuOpen(false);
              setIsDeleteDialogOpen(true);
            }}
            title="Delete Product"
            leadingIcon="delete-outline"
          />
        </Menu>
      </Appbar.Header>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Media View */}
        {viewMode === 'gallery' ? (
          <View style={[styles.galleryContainer, { paddingTop: insets.top + 56 }]}>
            {mediaList.length > 0 ? (
              mediaList.map((m, idx) => {
                if (m.mediaType === 2) {
                  return (
                    <VideoSlide 
                      key={m.id}
                      media={m} 
                      isActive={true} 
                      onFullscreen={() => {
                        setActiveMediaIndex(idx);
                        setIsPreviewOpen(true);
                      }} 
                      style={styles.galleryImageContainer}
                    />
                  );
                }
                
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      setActiveMediaIndex(idx);
                      setIsPreviewOpen(true);
                    }}
                    style={styles.galleryImageContainer}
                  >
                    <Image
                      source={{
                        uri: m.id && m.id !== '00000000-0000-0000-0000-000000000000'
                          ? productService.getThumbnailUrl(m.id, 'large')
                          : (m.storagePath ? productService.getThumbnailUrlByPath(m.storagePath, 'large') : 'https://via.placeholder.com/400')
                      }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                );
              })
            ) : (
                <View style={[styles.galleryImageContainer, styles.center, { backgroundColor: '#eee', width: width, aspectRatio: 1 }]}>
                    <Icon source="image-off" size={64} color="#ccc" />
                </View>
            )}
          </View>
        ) : (
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                setActiveMediaIndex(Math.round(x / width));
              }}
              scrollEventThrottle={16}
            >
              {mediaList.length > 0 ? (
                mediaList.map((m, idx) => {
                  const isWithinRange = Math.abs(idx - activeMediaIndex) <= 2;
                  
                  if (m.mediaType === 2) {
                    return (
                      <VideoSlide 
                        key={m.id} 
                        media={m} 
                        isActive={idx === activeMediaIndex} 
                        onFullscreen={() => setIsPreviewOpen(true)} 
                      />
                    );
                  }
                  
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.9}
                      onPress={() => setIsPreviewOpen(true)}
                      style={styles.carouselImage}
                    >
                      {isWithinRange ? (
                        <Image
                          source={{
                            uri: m.id && m.id !== '00000000-0000-0000-0000-000000000000'
                              ? productService.getThumbnailUrl(m.id, 'large')
                              : (m.storagePath ? productService.getThumbnailUrlByPath(m.storagePath, 'large') : 'https://via.placeholder.com/400')
                          }}
                          style={styles.carouselImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.carouselImage, { backgroundColor: '#111' }]} />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                  <View style={[styles.carouselImage, styles.center, { backgroundColor: '#eee' }]}>
                      <Icon source="image-off" size={64} color="#ccc" />
                  </View>
              )}
            </ScrollView>
            
            <View style={styles.mediaPaging}>
              {mediaList.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.pagingDot, 
                    { backgroundColor: i === activeMediaIndex ? 'white' : 'rgba(255,255,255,0.5)' }
                  ]} 
                />
              ))}
            </View>
          </View>
        )}

        {/* Product Details */}
        <View style={styles.detailsContent}>
          <View style={styles.row}>
            <Text variant="headlineMedium" style={styles.title}>{product.title || 'Product'}</Text>
            <CompactChip outline color={theme.colors.outline}>{product.productCode || 'N/A'}</CompactChip>
          </View>
          
          <Text variant="headlineSmall" style={[styles.price, { color: theme.colors.primary }]}>₹{product.vendorPrice}</Text>
          
          <View style={styles.tagRow}>
            {product.category && (
              <CompactChip icon="tag">{product.category}</CompactChip>
            )}
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
            <Text variant="bodyLarge" style={styles.description}>
              {product.exclusiveDescription || 'No description available for this product.'}
            </Text>
          </View>

          {/* Vendor Listings */}
          {product.listings && product.listings.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Vendor Listings ({product.listings.length})
              </Text>
              {product.listings.map((listing: VendorListing, idx: number) => (
                <Surface
                  key={listing.id}
                  style={[
                    styles.listingCard,
                    !listing.isActive && styles.listingCardInactive,
                  ]}
                  elevation={1}
                >
                  {/* Header row: vendor name + active badge */}
                  <View style={styles.listingHeader}>
                    <View style={styles.listingVendorRow}>
                      <Icon source="store" size={16} color={theme.colors.primary} />
                      <Text variant="titleSmall" style={[styles.listingVendorName, { color: theme.colors.primary }]} numberOfLines={1}>
                        {listing.vendorName || 'Unknown Vendor'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <IconButton
                        icon="arrow-expand-all"
                        size={16}
                        iconColor={theme.colors.primary}
                        style={{ margin: 0, padding: 0, width: 24, height: 24 }}
                        onPress={() => setPreviewListing(listing)}
                      />
                      {listing.sourceGroupId && listing.sourceJid && (
                        <IconButton
                          icon="whatsapp"
                          iconColor="#25D366"
                          size={18}
                          onPress={() =>
                            router.push({
                              pathname: '/utilities/whatsapp/messages/[jid]',
                              params: {
                                jid: listing.sourceJid!,
                                name: 'Source Chat',
                                highlightGroupId: listing.sourceGroupId || ''
                              },
                            })
                          }
                          style={{ margin: 0, padding: 0, width: 24, height: 24 }}
                        />
                      )}
                      <CompactChip
                        color={listing.isActive ? '#16a34a' : theme.colors.outline}
                        outline={!listing.isActive}
                      >
                        {listing.isActive ? 'Active' : 'Inactive'}
                      </CompactChip>
                    </View>
                  </View>

                  {/* Price + Shipping */}
                  <View style={[styles.listingPriceRow, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="headlineSmall" style={[styles.listingPrice, { color: theme.colors.primary }]}>
                        ₹{listing.price}
                      </Text>
                      {listing.currency && listing.currency !== 'INR' && (
                        <Text variant="bodySmall" style={styles.listingMeta}>{listing.currency}</Text>
                      )}
                      {listing.isPlusShipping !== undefined && (
                        <View style={[styles.shippingBadge, { backgroundColor: !listing.isPlusShipping ? '#f0fdf4' : '#f8fafc' }]}>
                          <Icon
                            source={!listing.isPlusShipping ? 'truck-check' : 'truck'}
                            size={13}
                            color={!listing.isPlusShipping ? '#16a34a' : '#64748b'}
                          />
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.shippingText,
                              { color: !listing.isPlusShipping ? '#16a34a' : '#64748b' },
                            ]}
                          >
                            {!listing.isPlusShipping ? 'FS' : '+$'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {(() => {
                        let dateObj = listing.updatedAt ? new Date(listing.updatedAt) : null;
                        if (listing.sourceGroupId) {
                          const parts = listing.sourceGroupId.split('_');
                          if (parts.length > 1) {
                            const ts = parseInt(parts[parts.length - 1], 10);
                            if (!isNaN(ts) && ts > 1000000000) {
                              dateObj = new Date(ts * 1000);
                            }
                          }
                        }
                        return dateObj ? (
                          <Text variant="bodySmall" style={styles.listingMeta}>
                            {dateObj.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </Text>
                        ) : null;
                      })()}
                      {listing.description && (
                        <IconButton 
                          icon="content-copy" 
                          size={16} 
                          onPress={() => {
                            import('expo-clipboard').then(Clipboard => {
                                Clipboard.setStringAsync(listing.description || '');
                                Alert.alert('Copied', 'Vendor listing description copied to clipboard', [], { cancelable: true });
                            });
                          }}
                          style={{ margin: 0, padding: 0 }}
                        />
                      )}
                    </View>
                  </View>

                  {/* Description */}
                  {listing.description && (
                    <Text variant="bodySmall" style={styles.listingDescription}>
                      {listing.description.replace(/\s+/g, ' ').trim()}
                    </Text>
                  )}
                </Surface>
              ))}
            </View>
          )}

          <View style={styles.section}>
             <Text variant="titleMedium" style={styles.sectionTitle}>Tags & Metadata</Text>
             <View style={styles.tagContainer}>
                {['Recent', 'Premium', 'Fast Shipping'].map(t => (
                    <CompactChip key={t}>{t}</CompactChip>
                ))}
             </View>
          </View>



          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Vendor Preview Modal */}
      <RNModal
        visible={!!previewListing}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewListing(null)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback onPress={() => setPreviewListing(null)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          
          <View style={{ 
            height: '95%', 
            backgroundColor: 'white', 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 10
          }}>
            <View {...panResponder.panHandlers} style={{ alignItems: 'center', paddingVertical: 12 }}>
               <View style={{ width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3 }} />
            </View>
            
            {previewListing && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{previewListing.vendorName || 'Vendor Listing'}</Text>
                  <IconButton icon="close" size={20} onPress={() => setPreviewListing(null)} style={{ margin: 0 }} />
                </View>
                <ScrollView style={{ padding: 16 }}>
                  {(() => {
                    const mediaList = product?.media?.filter(m => m.storagePath?.includes(previewListing.sourceGroupId?.split('@')[0])) || [];
                    return mediaList.length > 0 ? (
                      <FlatList
                        horizontal
                        data={mediaList}
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
                        renderItem={({ item }: { item: any }) => {
                          const uri = item.id && item.id !== '00000000-0000-0000-0000-000000000000'
                            ? productService.getThumbnailUrl(item.id, 'large')
                            : (item.storagePath ? productService.getThumbnailUrlByPath(item.storagePath, 'large') : 'https://via.placeholder.com/400');
                          return (
                            <View style={{ width: Dimensions.get('window').width - 32, height: Dimensions.get('window').width - 32, marginRight: 8, borderRadius: 8, overflow: 'hidden' }}>
                              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                            </View>
                          );
                        }}
                        style={{ marginBottom: 16 }}
                      />
                    ) : (
                      <View style={{ height: 200, backgroundColor: '#f5f5f5', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ opacity: 0.5 }}>No specific media found</Text>
                      </View>
                    );
                  })()}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>₹{previewListing.price}</Text>
                    {previewListing.isPlusShipping !== undefined && (
                      <Chip compact style={{ backgroundColor: !previewListing.isPlusShipping ? '#f0fdf4' : '#f8fafc' }} textStyle={{ color: !previewListing.isPlusShipping ? '#16a34a' : '#64748b', fontSize: 12 }}>
                        {!previewListing.isPlusShipping ? 'Free shipping' : 'Plus shipping'}
                      </Chip>
                    )}
                  </View>

                  <Text variant="bodyMedium" style={{ lineHeight: 22, opacity: 0.8, marginBottom: 24 }}>
                    {previewListing.description}
                  </Text>

                  {previewListing.sourceGroupId && previewListing.sourceJid && (
                    <Button
                      mode="contained"
                      icon="whatsapp"
                      buttonColor="#25D366"
                      onPress={() => {
                        setPreviewListing(null);
                        router.push({
                          pathname: '/utilities/whatsapp/messages/[jid]',
                          params: {
                            jid: previewListing.sourceJid!,
                            name: 'Source Chat',
                            highlightGroupId: previewListing.sourceGroupId || ''
                          },
                        });
                      }}
                      style={{ marginBottom: 40 }}
                    >
                      View Source Chat
                    </Button>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </RNModal>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={isDeleteDialogOpen} onDismiss={() => setIsDeleteDialogOpen(false)}>
          <Dialog.Title>Delete Product?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This action cannot be undone. Are you sure you want to remove this product from the catalog?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={handleDelete} loading={isDeleting}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* High Quality Preview Modal */}
      <RNModal visible={isPreviewOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
            <IconButton 
                icon="close" 
                iconColor="white" 
                size={30} 
                onPress={() => setIsPreviewOpen(false)}
                style={styles.closeBtn}
            />
            {mediaList[activeMediaIndex] && (
                <>
                    <View style={{ width, height: '70%' }}>
                      <FlatList
                        data={Array(50).fill(mediaList).flat()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        getItemLayout={(_, index) => ({
                          length: width,
                          offset: width * index,
                          index,
                        })}
                        initialScrollIndex={25 * mediaList.length + activeMediaIndex}
                        onMomentumScrollEnd={(e) => {
                          const index = Math.round(e.nativeEvent.contentOffset.x / width);
                          if (mediaList.length > 0) {
                            setActiveMediaIndex(index % mediaList.length);
                          }
                        }}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item: m }) => (
                          <View style={{ width, height: '100%', justifyContent: 'center' }}>
                            <Image
                                source={{ 
                                uri: m.id && m.id !== '00000000-0000-0000-0000-000000000000' 
                                    ? productService.getThumbnailUrl(m.id, 'large') 
                                    : (m.storagePath ? productService.getThumbnailUrlByPath(m.storagePath, 'large') : 'https://via.placeholder.com/800')
                                }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="contain"
                            />
                          </View>
                        )}
                      />
                    </View>
                    
                    <View style={[styles.mediaPaging, { bottom: 120 }]}>
                      {mediaList.map((_, i) => (
                        <View 
                          key={i} 
                          style={[
                            styles.pagingDot, 
                            { backgroundColor: i === activeMediaIndex ? 'white' : 'rgba(255,255,255,0.5)' }
                          ]} 
                        />
                      ))}
                    </View>

                    <View style={styles.modalActions}>
                        <Button 
                            mode="contained" 
                            icon={downloadProgress !== null ? "loading" : "download"} 
                            loading={downloadProgress !== null}
                            disabled={downloadProgress !== null}
                            onPress={async () => {
                                try {
                                    const m = mediaList[activeMediaIndex];
                                    const url = m.storagePath 
                                        ? productService.getMediaUrlByPath(m.storagePath)
                                        : productService.getThumbnailUrl(m.id, 'large');
                                    const path = m.storagePath || '';
                                    const extension = path.split('.').pop()?.toLowerCase() || 'jpg';
                                    
                                    setDownloadProgress(0);
                                    await downloadMedia(url, `product_${product.productCode}_${m.id || Date.now()}.${extension}`, (p) => {
                                        setDownloadProgress(p);
                                    });
                                    setDownloadProgress(null);
                                    Alert.alert('Success', 'Media saved to gallery!');
                                } catch (err) {
                                    setDownloadProgress(null);
                                    Alert.alert('Error', 'Failed to download media');
                                }
                            }}
                            style={styles.modalActionBtn}
                        >
                            {downloadProgress !== null ? `${Math.round(downloadProgress * 100)}%` : 'Download'}
                        </Button>
                        <Button 
                            mode="contained" 
                            icon={shareProgress !== null ? "loading" : "share-variant"} 
                            loading={shareProgress !== null}
                            disabled={shareProgress !== null || downloadProgress !== null}
                            onPress={async () => {
                                try {
                                    const m = mediaList[activeMediaIndex];
                                    const url = m.storagePath 
                                        ? productService.getMediaUrlByPath(m.storagePath)
                                        : productService.getThumbnailUrl(m.id, 'large');
                                    const path = m.storagePath || '';
                                    const extension = path.split('.').pop()?.toLowerCase() || 'jpg';
                                    
                                    setShareProgress(0);
                                    await shareMedia(url, extension, (p) => {
                                        setShareProgress(p);
                                    });
                                    setShareProgress(null);
                                } catch (err) {
                                    setShareProgress(null);
                                    Alert.alert('Error', 'Failed to share media');
                                }
                            }}
                            style={styles.modalActionBtn}
                        >
                            {shareProgress !== null ? `Preparing (${Math.round(shareProgress * 100)}%)` : 'Share'}
                        </Button>
                        <Button
                          mode="contained"
                          icon="image-outline"
                          onPress={async () => {
                            try {
                              const m = mediaList[activeMediaIndex];
                              if (m && m.id) {
                                await setDefaultMedia(m.id);
                                Alert.alert('Success', 'Media set as cover successfully');
                              }
                            } catch (err) {
                              Alert.alert('Error', 'Failed to set cover media');
                            }
                          }}
                          style={styles.modalActionBtn}
                        >
                          Cover
                        </Button>
                    </View>
                </>
            )}
        </View>
      </RNModal>

    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  carouselContainer: {
    width: width,
    height: width * 1.3,
  },
  carouselImage: {
    width: width,
    height: width * 1.3,
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#000',
    paddingBottom: 48,
    gap: 2,
  },
  galleryImageContainer: {
    width: Math.floor((width - 4) / 3),
    height: Math.floor((width - 4) / 3) * 1.3,
    backgroundColor: '#111',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  mediaPaging: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  pagingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailsContent: {
    padding: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'white',
    marginTop: -32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  codeChip: {
    height: 24,
  },
  price: {
    fontWeight: '900',
    marginTop: 8,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  description: {
    lineHeight: 24,
    opacity: 0.7,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallTag: {
    height: 24,
    backgroundColor: '#f5f5f5',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: width,
    height: '80%',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  modalActions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 40,
    gap: 16,
  },
  modalActionBtn: {
    minWidth: 120,
  },
  listingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  listingCardInactive: {
    opacity: 0.55,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingVendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  listingVendorName: {
    fontWeight: '700',
    flexShrink: 1,
  },
  listingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  listingPrice: {
    fontWeight: '900',
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shippingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listingDescription: {
    opacity: 0.65,
    lineHeight: 18,
    marginBottom: 8,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  listingMeta: {
    opacity: 0.45,
    fontSize: 11,
  },
});
