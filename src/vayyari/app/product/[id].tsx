import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native-paper';
import { CompactChip } from '@/components/ui/CompactChip';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { productService } from '@/services/productService';
import type { VendorProduct } from '@/types/products';
import { downloadMedia, shareMedia } from '@/utils/media-helpers';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  
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
      <Appbar.Header style={{ backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <Appbar.BackAction onPress={() => router.back()} color="white" style={styles.headerBtn} />
        <Appbar.Content title="" />
        <Appbar.Action icon="star-outline" onPress={handleStarMedia} color="white" style={styles.headerBtn} />
        <Appbar.Action icon="reorder-horizontal" onPress={() => {}} color="white" style={styles.headerBtn} />
        <Appbar.Action icon="delete" onPress={() => setIsDeleteDialogOpen(true)} color="white" style={styles.headerBtn} />
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
              mediaList.map((m, idx) => (
                <TouchableOpacity 
                   key={m.id} 
                   activeOpacity={0.9}
                   onPress={() => setIsPreviewOpen(true)}
                >
                  <Image
                    source={{ 
                      uri: m.id && m.id !== '00000000-0000-0000-0000-000000000000' 
                        ? productService.getThumbnailUrl(m.id, 'large') 
                        : (m.storagePath ? productService.getThumbnailUrlByPath(m.storagePath, 'large') : 'https://via.placeholder.com/400')
                    }}
                    style={styles.carouselImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))
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
});
