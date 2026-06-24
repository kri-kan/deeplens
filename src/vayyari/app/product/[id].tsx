import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
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
} from 'react-native-paper';
import { CompactChip } from '@/components/ui/CompactChip';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { productService } from '@/services/productService';
import type { VendorProduct, MediaEntry, VendorListing } from '@/types/products';
import { downloadMedia, shareMedia } from '@/utils/media-helpers';

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
function VideoSlide({ media, isActive, onFullscreen }: { media: MediaEntry; isActive: boolean; onFullscreen: () => void }) {
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

  if (!videoUrl) {
    return (
      <View style={[styles.carouselImage, styles.center, { backgroundColor: '#111' }]}>
        <Icon source="video-off" size={48} color="#555" />
        <Text style={{ color: '#555', marginTop: 8 }}>Video unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.carouselImage}>
      {isActive && isPlaying ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setIsPlaying(false)} style={styles.carouselImage}>
          <ActiveVideoPlayer videoUrl={videoUrl} isPlaying={isPlaying} style={styles.carouselImage} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setIsPlaying(true)} style={styles.carouselImage}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#000' }]} />
          )}
          <View style={styles.videoOverlay}>
            <View style={styles.playBtn}>
              <Icon source="play-circle" size={72} color="rgba(255,255,255,0.95)" />
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
  
  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [shareProgress, setShareProgress] = useState<number | null>(null);

  const fetchProductDetails = useCallback(async () => {
    setLoading(true);
    try {
      if (id) {
        const prod = await productService.getProductById(id);
        setProduct(prod);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleManualEnrich = async () => {
    if (!product?.sourceGroupId) {
      Alert.alert('Error', 'Cannot enrich: No Source Group ID found for this product.');
      return;
    }
    try {
      await productService.retryEnrichment(product.sourceGroupId);
      Alert.alert('Success', 'Manual enrichment initiated successfully');
      fetchProductDetails();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to initiate manual enrichment');
    }
  };

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
        <Appbar.Action icon="star-outline" onPress={handleStarMedia} color="white" style={styles.headerBtn} />
        <Appbar.Action icon="reorder-horizontal" onPress={() => {}} color="white" style={styles.headerBtn} />
        <Appbar.Action icon="delete" onPress={() => setIsDeleteDialogOpen(true)} color="white" style={styles.headerBtn} />
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
              handleManualEnrich();
            }} 
            title="Manual Enrich" 
            leadingIcon="refresh"
          />
          <Menu.Item 
            onPress={() => {
              setIsMenuOpen(false);
              handleReevaluateLLM();
            }} 
            title="Manual Re-evaluate with LLM" 
            leadingIcon="robot-outline"
          />
        </Menu>
      </Appbar.Header>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Media Carousel */}
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
                      <Text variant="titleSmall" style={[styles.listingVendorName, { color: theme.colors.primary }]}>
                        {listing.vendorName || 'Unknown Vendor'}
                      </Text>
                    </View>
                    <CompactChip
                      color={listing.isActive ? '#16a34a' : theme.colors.outline}
                      outline={!listing.isActive}
                    >
                      {listing.isActive ? 'Active' : 'Inactive'}
                    </CompactChip>
                  </View>

                  {/* Price + Shipping */}
                  <View style={styles.listingPriceRow}>
                    <Text variant="headlineSmall" style={[styles.listingPrice, { color: theme.colors.primary }]}>
                      ₹{listing.price}
                    </Text>
                    {listing.currency && listing.currency !== 'INR' && (
                      <Text variant="bodySmall" style={styles.listingMeta}>{listing.currency}</Text>
                    )}
                    {listing.shippingInfo && (
                      <View style={styles.shippingBadge}>
                        <Icon
                          source={listing.shippingInfo.toLowerCase().includes('free') ? 'truck-check' : 'truck'}
                          size={13}
                          color={listing.shippingInfo.toLowerCase().includes('free') ? '#16a34a' : '#64748b'}
                        />
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.shippingText,
                            { color: listing.shippingInfo.toLowerCase().includes('free') ? '#16a34a' : '#64748b' },
                          ]}
                        >
                          {listing.shippingInfo.toLowerCase().includes('free') ? 'Free shipping' : 'Plus shipping'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  {listing.description && (
                    <Text variant="bodySmall" style={styles.listingDescription} numberOfLines={3}>
                      {listing.description}
                    </Text>
                  )}

                  {/* Footer: last updated + source chat link */}
                  <View style={styles.listingFooter}>
                    {listing.updatedAt && (
                      <Text variant="bodySmall" style={styles.listingMeta}>
                        Updated {new Date(listing.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                    {listing.sourceGroupId && listing.sourceJid && (
                      <Button
                        compact
                        mode="text"
                        icon="whatsapp"
                        textColor="#25D366"
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
                      >
                        View Chat
                      </Button>
                    )}
                  </View>
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
      <Modal visible={isPreviewOpen} transparent animationType="fade">
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
                    <Image
                        source={{ 
                        uri: mediaList[activeMediaIndex].id && mediaList[activeMediaIndex].id !== '00000000-0000-0000-0000-000000000000' 
                            ? productService.getThumbnailUrl(mediaList[activeMediaIndex].id, 'large') 
                            : (mediaList[activeMediaIndex].storagePath ? productService.getThumbnailUrlByPath(mediaList[activeMediaIndex].storagePath, 'large') : 'https://via.placeholder.com/800')
                        }}
                        style={styles.previewImage}
                        contentFit="contain"
                    />
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
                    </View>
                </>
            )}
        </View>
      </Modal>

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
