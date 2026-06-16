import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Linking, FlatList, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, IconButton, useTheme, Button, Portal, Dialog, List, Divider, Switch, Icon } from 'react-native-paper';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { EdgeInsets } from 'react-native-safe-area-context';
import { instagramService, InstagramPost } from '@/services/instagram.service';
import { productService } from '@/services/productService';
import { ProductTile } from '@/components/utility/product/ProductTile';
import type { VendorProduct } from '@/types/products';
import { InstagramVideoPlayer } from './InstagramVideoPlayer';
import { YoutubeShortsScheduleForm } from '../youtube/YoutubeShortsScheduleForm';
import { InstagramLink, normalizeData, isVideo, getMediaUri, getBaseId } from '@/utils/instagram-helpers';
import { downloadMedia, shareMedia } from '@/utils/media-helpers';
import { InstagramCommentsModal } from './InstagramCommentsModal';

const { width, height } = Dimensions.get('window');

interface PostDetailItemProps {
    item: InstagramPost;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    volume: number;
    setVolume: (volume: number) => void;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    isActive: boolean;
    insets: EdgeInsets;
    onDraggingStateChange?: (dragging: boolean) => void;
    onPostUpdated?: (updatedPost: InstagramPost) => void;
}

export const InstagramPostDetailItem = ({ 
    item,
    isMuted, 
    setIsMuted, 
    volume, 
    setVolume, 
    isPlaying, 
    setIsPlaying, 
    isActive,
    insets,
    onDraggingStateChange,
    onPostUpdated
}: PostDetailItemProps) => {
    const theme = useTheme();
    const router = useRouter();
    const [mediaLinks, setMediaLinks] = useState<InstagramPost[]>([]);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [mediaAspectRatios, setMediaAspectRatios] = useState<{[key: string]: number}>({});
    const [linkedProductDetails, setLinkedProductDetails] = useState<VendorProduct | null>(null);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [processingUnlink, setProcessingUnlink] = useState(false);
    const [hasFetchedLinks, setHasFetchedLinks] = useState(false);
    const hasFetchedLinksSV = useSharedValue(false);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [existingLinks, setExistingLinks] = useState<InstagramLink[]>([]);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isRefreshingMedia, setIsRefreshingMedia] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [shareProgress, setShareProgress] = useState<number | null>(null);
    const [localItem, setLocalItem] = useState(item);

    // Syncing State
    const [isSyncingComments, setIsSyncingComments] = useState(false);
    const [isDeepSync, setIsDeepSync] = useState(false);

    // YouTube Upload State
    const [isYoutubeDialogVisible, setIsYoutubeDialogVisible] = useState(false);
    const [isYoutubeBusy, setIsYoutubeBusy] = useState(false);

    // Meta Config & Token Selection State
    const [isTokenSelectionVisible, setIsTokenSelectionVisible] = useState(false);
    const [availableConfigs, setAvailableConfigs] = useState<any[]>([]);
    const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

    // Comments Modal Preview State
    const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);

    // Sync local item and reset state when item changes (for component reuse)
    useEffect(() => {
        if (item.id !== localItem.id) {
            setLocalItem(item);
            setHasFetched(false);
            setHasFetchedLinks(false);
            hasFetchedLinksSV.value = false;
            setMediaLinks([]);
            setLinkedProductDetails(null);
            setActiveMediaIndex(0);
        } else {
            setLocalItem(item);
        }
    }, [item]);

    // Close menu when post becomes inactive
    useEffect(() => {
        if (!isActive && isMenuVisible) {
            setIsMenuVisible(false);
            menuSheetTop.value = MENU_HIDDEN;
        }
    }, [isActive]);

    // Draggable Sheet Logic
    const START_TOP = height * 0.85;
    const END_TOP = height * 0.15;
    const sheetTop = useSharedValue(START_TOP);

    // Menu Sheet Logic
    const MENU_HIDDEN = 500;
    const MENU_VISIBLE = 0;
    const menuSheetTop = useSharedValue(MENU_HIDDEN);
    
    // YouTube Sheet Logic
    const YOUTUBE_SHEET_HIDDEN = height;
    const YOUTUBE_SHEET_VISIBLE = 0;
    const youtubeSheetTop = useSharedValue(YOUTUBE_SHEET_HIDDEN);

    const handleYoutubeSuccess = async (resp: any) => {
        const videoEntry = mediaLinks.find(m => isVideo(m) && (m.storagePath || '').toLowerCase().endsWith('.mp4')) 
            || mediaLinks.find(m => isVideo(m))
            || (isVideo(localItem) ? localItem : null);
        
        try {
            // Persist the YouTube info against the Instagram post
            await instagramService.updateYoutubeStatus(localItem.id, {
                videoId: resp.videoId,
                videoUrl: resp.videoUrl,
                status: resp.scheduledTime ? 'Scheduled' : 'Uploaded',
                scheduledTime: resp.scheduledTime
            });
            
            youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_HIDDEN);
            setTimeout(() => setIsYoutubeDialogVisible(false), 300);
            postDetailsRefresh();
        } catch (error) {
            console.error('Failed to persist YouTube status', error);
            Alert.alert('Persistence Error', 'Video scheduled but local status failed to update.');
        } finally {
            setIsYoutubeBusy(false);
        }
    };

    const handleYoutubeCancel = () => {
        if (!isYoutubeBusy) {
            youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_HIDDEN);
            setTimeout(() => setIsYoutubeDialogVisible(false), 300);
        }
    };

    const resolveYoutubeMediaId = () => {
        // 1. Current viewed item in carousel
        const currentMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
        if (isVideo(currentMedia) && !(currentMedia.storagePath || '').toLowerCase().endsWith('.jpg')) {
            return currentMedia.id;
        }

        // 2. Search for the first valid video in children/links
        const videoEntry = mediaLinks.find(m => isVideo(m) && (m.storagePath || '').toLowerCase().endsWith('.mp4')) 
            || mediaLinks.find(m => isVideo(m) && !(m.storagePath || '').toLowerCase().endsWith('.jpg'));
        
        if (videoEntry) return videoEntry.id;

        // 3. Last fallback: localItem if it's a video (though it might be a JPG path, the backend now handles this)
        return isVideo(localItem) ? localItem.id : undefined;
    };

    const resolveYoutubeVideoUri = () => {
        const currentMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
        if (isVideo(currentMedia) && !(currentMedia.storagePath || '').toLowerCase().endsWith('.jpg')) {
            return getMediaUri(currentMedia);
        }

        const videoEntry = mediaLinks.find(m => isVideo(m) && (m.storagePath || '').toLowerCase().endsWith('.mp4')) 
            || mediaLinks.find(m => isVideo(m) && !(m.storagePath || '').toLowerCase().endsWith('.jpg'));
        
        return videoEntry ? getMediaUri(videoEntry) : getMediaUri(localItem);
    };

    const fetchLinks = useCallback(async (force = false) => {
        if (hasFetchedLinks && !force) return;
        try {
            setHasFetchedLinks(true);
            hasFetchedLinksSV.value = true;
            const links = await instagramService.getInstagramLinksAsync(localItem.id);
            setExistingLinks(links || []);
            
            const isLink = links?.find(l => l.linkType?.toLowerCase() === 'is');
            if (isLink) {
                const product = await productService.getProductById(isLink.productId);
                setLinkedProductDetails(product);
            } else {
                setLinkedProductDetails(null);
            }
        } catch (e) {
            console.error("Error fetching links", e);
            if (!force) setHasFetchedLinks(false);
        }
    }, [localItem.id, hasFetchedLinks]);

    // Refresh links when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (hasFetchedLinks) {
                fetchLinks(true);
            }
        }, [hasFetchedLinks, fetchLinks])
    );

    const fetchMedia = useCallback(async () => {
        if (!localItem?.id || hasFetched) return;
        setLoadingMedia(true);
        try {
            const links = await instagramService.getPostMedia(localItem.id);
            const mainPath = localItem.storagePath;
            const childLinks = (links || []).filter((link: InstagramPost) => {
                const linkPath = (link.storagePath || '').toLowerCase();
                return linkPath.includes('_child');
            });

            let filteredLinks = childLinks.length > 0 ? childLinks : (links || []).filter((link: InstagramPost) => {
                const linkPath = link.storagePath || '';
                const itemId = getBaseId(linkPath);
                const mainId = getBaseId(mainPath || '');
                return !(mainId && itemId === mainId && (links || []).length > 1);
            });

            setMediaLinks(filteredLinks.map(normalizeData));
            setHasFetched(true);
        } catch (error) {
            console.error('Failed to fetch media', error);
        } finally {
            setLoadingMedia(false);
        }
    }, [localItem?.id, localItem.storagePath, hasFetched]);

    // Automatically fetch media and links when active
    useEffect(() => {
        if (isActive) {
            fetchMedia();
            fetchLinks();
        }
    }, [isActive, fetchMedia, fetchLinks]);

    const postDetailsRefresh = async (skipApiRefresh: boolean = false) => {
        try {
            setIsRefreshingMedia(true);
            setIsMenuVisible(false);
            menuSheetTop.value = withSpring(MENU_HIDDEN);
            
            //we never want to ususally do this
            if (!skipApiRefresh) {
                await instagramService.refreshPostMedia(localItem.id);
            }
            
            // Get updated post metadata from DB
            const updated = await instagramService.getVideoDetails(localItem.id);
            if (updated) {
                const normalized = normalizeData(updated);
                setLocalItem(normalized);
                onPostUpdated?.(normalized);
            }
            
            // Force refresh all links and media files
            setHasFetchedLinks(false);
            await fetchLinks(true);
            setHasFetched(false); 
            await fetchMedia();
        } catch (error) {
            console.error('Refresh failed', error);
        } finally {
            setIsRefreshingMedia(false);
        }
    };

    const handleSyncComments = async () => {
        try {
            setIsDeepSync(false);
            setIsMenuVisible(false);
            menuSheetTop.value = withSpring(MENU_HIDDEN);
            setIsLoadingConfigs(true);
            
            // Fetch configurations to get the access tokens
            const configs = await instagramService.getConfigurations();
            setIsLoadingConfigs(false);
            
            if (!configs || configs.length === 0) {
                Alert.alert('Configuration Required', 'Please set up a Meta Graph API configuration with a valid Access Token first.');
                return;
            }

            // Store configurations and show selection dialog
            setAvailableConfigs(configs);
            setIsTokenSelectionVisible(true);
        } catch (err: any) {
            setIsLoadingConfigs(false);
            console.error('Comment sync init failed', err);
            Alert.alert('Error', err.message || 'Failed to fetch Meta configurations.');
        }
    };

    const executeSyncComments = async (accessToken: string) => {
        try {
            setIsTokenSelectionVisible(false);
            setIsSyncingComments(true);

            await instagramService.syncPostComments(localItem.id, accessToken, isDeepSync);
            Alert.alert('Success', 'Comments synchronization completed successfully.');
            
            // Refresh to update comment count if possible
            await postDetailsRefresh(true);
        } catch (err: any) {
            console.error('Comment sync failed', err);
            Alert.alert('Sync Failed', err.message || 'An unexpected error occurred.');
        } finally {
            setIsSyncingComments(false);
        }
    };

    const getMediaHeight = () => {
        const activeMedia = mediaLinks[activeMediaIndex] || localItem;
        const ratio = mediaAspectRatios[activeMedia?.id || 'initial'] || (isVideo(localItem) ? 9/16 : 1);
        return width / ratio;
    };
    
    const context = useSharedValue(0);
    const menuContext = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = sheetTop.value;
            if (onDraggingStateChange) {
                runOnJS(onDraggingStateChange)(true);
            }
        })
        .onUpdate((e) => {
            sheetTop.value = Math.max(END_TOP, Math.min(START_TOP, context.value + e.translationY));
            if (!hasFetchedLinksSV.value && sheetTop.value < START_TOP - 100) {
                hasFetchedLinksSV.value = true;
                runOnJS(fetchLinks)();
            }
        })
        .onEnd((e) => {
            if (onDraggingStateChange) {
                runOnJS(onDraggingStateChange)(false);
            }
            if (e.translationY > 150 || e.velocityY > 1000) {
                sheetTop.value = withSpring(START_TOP, { velocity: e.velocityY });
                runOnJS(setIsExpanded)(false);
            } else if (e.translationY < -150 || e.velocityY < -1000) {
                sheetTop.value = withSpring(END_TOP, { velocity: e.velocityY });
                runOnJS(setIsExpanded)(true);
            } else {
                // Determine snap point based on current position instead of JS state
                const snapPoint = sheetTop.value < (START_TOP + END_TOP) / 2 ? END_TOP : START_TOP;
                sheetTop.value = withSpring(snapPoint);
                runOnJS(setIsExpanded)(snapPoint === END_TOP);
            }
        });

    const menuPanGesture = Gesture.Pan()
        .onStart(() => {
            menuContext.value = menuSheetTop.value;
        })
        .onUpdate((e) => {
            menuSheetTop.value = Math.max(MENU_VISIBLE, menuContext.value + e.translationY);
        })
        .onEnd((e) => {
            if (e.translationY > 100 || e.velocityY > 500) {
                menuSheetTop.value = withSpring(MENU_HIDDEN);
                runOnJS(setIsMenuVisible)(false);
            } else {
                menuSheetTop.value = withSpring(MENU_VISIBLE);
            }
        });

    const youtubePanGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (isYoutubeBusy) return;
            youtubeSheetTop.value = Math.max(YOUTUBE_SHEET_VISIBLE, YOUTUBE_SHEET_VISIBLE + e.translationY);
        })
        .onEnd((e) => {
            if (isYoutubeBusy) {
                youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_VISIBLE);
                return;
            }
            if (e.translationY > 100 || e.velocityY > 500) {
                youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_HIDDEN);
                runOnJS(setIsYoutubeDialogVisible)(false);
            } else {
                youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_VISIBLE);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetTop.value }],
        height: height - END_TOP,
    }));

    const menuAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: menuSheetTop.value }],
    }));

    const youtubeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: youtubeSheetTop.value }],
    }));

    // Prioritize fetched linked details, but fall back to localItem.productCode only if we haven't confirmed it's gone
    const productCodeToDisplay = linkedProductDetails?.productCode || (!hasFetchedLinks ? localItem.productCode : null);

    return (
        <View style={{ width, height, backgroundColor: theme.colors.background }}>
            <View style={{ flex: 1 }}>
                {/* Top Menu Icons - Only visible for active post */}
                {isActive && (
                    <>
                        {localItem.youtubeUrl && (
                            <View style={[styles.topLeftIconContainer, { top: insets.top + 60 }]}>
                                <IconButton 
                                    icon="youtube" 
                                    iconColor="#FF0000" 
                                    size={24} 
                                    style={styles.youtubeFloatingBtn}
                                    onPress={() => Linking.openURL(localItem.youtubeUrl!)}
                                />
                            </View>
                        )}
                        <View style={[styles.topMenuContainer, { top: insets.top + 10 }]}>
                            <IconButton 
                                icon="dots-vertical" 
                                iconColor="white" 
                                size={24} 
                                style={styles.menuTrigger}
                                onPress={() => {
                                    setIsMenuVisible(true);
                                    menuSheetTop.value = withSpring(MENU_VISIBLE);
                                }}
                            />
                        </View>
                    </>
                )}

                <View style={[styles.mediaContainer, { 
                    marginTop: insets.top, 
                    height: START_TOP - insets.top,
                    backgroundColor: theme.colors.background 
                }]}>
                    <FlatList
                        horizontal
                        pagingEnabled
                        contentContainerStyle={{ alignItems: 'center' }}
                        data={mediaLinks.length > 0 ? mediaLinks : [localItem]}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setActiveMediaIndex(index);
                        }}
                        renderItem={({ item: media, index: mediaIdx }) => {
                            const mHeight = getMediaHeight();
                            const isPlayerActive = isActive && mediaIdx === activeMediaIndex;
                            
                            return (
                                <View key={media.id || mediaIdx} style={{ width, height: START_TOP - insets.top, justifyContent: 'center' }}>
                                    {isVideo(media) ? (
                                        <InstagramVideoPlayer 
                                            media={media}
                                            width={width}
                                            getMediaHeight={getMediaHeight}
                                            isMuted={isMuted}
                                            setIsMuted={setIsMuted}
                                            volume={volume}
                                            setVolume={setVolume}
                                            isPlaying={isPlaying}
                                            isActive={isPlayerActive}
                                        />
                                    ) : (
                                        <Image 
                                            source={{ uri: getMediaUri(media, 'large') }} 
                                            style={{ width, height: mHeight }}
                                            contentFit="cover"
                                            onLoad={(e) => {
                                                const ratio = e.source.width / e.source.height;
                                                setMediaAspectRatios(prev => ({ ...prev, [media.id || 'initial']: ratio }));
                                            }}
                                        />
                                    )}
                                </View>
                            );
                        }}
                        keyExtractor={(m, i) => m.id || i.toString()}
                        showsHorizontalScrollIndicator={false}
                    />
                    
                    {mediaLinks.length > 1 && (
                        <View style={styles.carouselIndicators}>
                            <View style={styles.dotsContainer}>
                                {mediaLinks.map((_, i) => (
                                    <View 
                                        key={i} 
                                        style={[
                                            styles.dot, 
                                            activeMediaIndex === i ? styles.activeDot : styles.inactiveDot
                                        ]} 
                                    />
                                ))}
                            </View>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeText}>{activeMediaIndex + 1}/{mediaLinks.length}</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.actionColumn}>
                    <View style={styles.statItem}>
                        <IconButton icon="heart" iconColor="white" size={24} style={styles.statIcon} />
                        <Text style={styles.statText}>{((localItem?.likeCount) || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <IconButton 
                            icon="comment" 
                            iconColor="white" 
                            size={24} 
                            style={styles.statIcon} 
                            onPress={() => setIsCommentsModalVisible(true)}
                        />
                        <TouchableOpacity onPress={() => setIsCommentsModalVisible(true)}>
                            <Text style={styles.statText}>{((localItem?.commentCount) || 0).toLocaleString()}</Text>
                        </TouchableOpacity>
                    </View>
                    <IconButton icon="open-in-new" iconColor="white" size={24} onPress={() => localItem?.permalink && Linking.openURL(localItem.permalink)} />
                    <IconButton icon="link-variant" iconColor="white" size={24} onPress={async () => localItem?.permalink && await Clipboard.setStringAsync(localItem.permalink)} />
                </View>

                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.detailsContainer, animatedStyle]}>
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.captionContainer}>
                            <TouchableOpacity 
                                onPress={() => setIsExpanded(!isExpanded)} 
                                style={styles.captionContent}
                                activeOpacity={0.7}
                            >
                                <Text variant="bodyMedium" style={styles.caption} numberOfLines={isExpanded ? undefined : 1}>
                                    {localItem.caption || "No caption"}
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.captionActions}>
                                <IconButton 
                                    icon="content-copy" 
                                    size={22} 
                                    iconColor="#666"
                                    onPress={() => {
                                        const cleanCaption = (localItem.caption || '').replace(/#\w+/g, '').replace(/\s\s+/g, ' ').trim();
                                        Clipboard.setStringAsync(cleanCaption);
                                    }}
                                    style={styles.captionActionIcon} 
                                />
                                <IconButton 
                                    icon={isExpanded ? "chevron-up" : "chevron-down"} 
                                    size={28} 
                                    iconColor="#666"
                                    onPress={() => setIsExpanded(!isExpanded)}
                                    style={styles.captionActionIcon} 
                                />
                            </View>
                        </View>

                        {/* Primary Product Section */}
                        <View style={styles.relationSection}>
                            {productCodeToDisplay ? (
                                <View style={styles.primaryProductContainer}>
                                    <View style={styles.primaryHeaderRow}>
                                        <TouchableOpacity 
                                            onPress={() => Clipboard.setStringAsync(productCodeToDisplay)}
                                            activeOpacity={0.7}
                                            style={{ flex: 1 }}
                                        >
                                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                                Product: {productCodeToDisplay}
                                            </Text>
                                        </TouchableOpacity>
                                        <IconButton 
                                            icon="link-off" 
                                            size={20} 
                                            iconColor={theme.colors.error} 
                                            onPress={() => setIsUnlinking(true)} 
                                            style={styles.inlineActionIcon}
                                        />
                                    </View>
                                    
                                    {linkedProductDetails && (
                                        <View style={styles.previewTileWrapper}>
                                            <ProductTile 
                                                item={linkedProductDetails} 
                                                onPress={(p) => router.push(`/product/${p.id}` as any)} 
                                                sizeRatio={0.45} 
                                            />
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View>
                                    <Button 
                                        mode="contained" 
                                        icon="plus"
                                        onPress={() => router.push({
                                            pathname: '/utilities/instagram/link-product',
                                            params: { id: localItem.id, data: JSON.stringify(localItem), allowedTypes: 'is' }
                                        } as any)}
                                        style={{ marginTop: 8 }}
                                    >
                                        Link or Create as Product
                                    </Button>
                                </View>
                            )}
                        </View>

                        {/* Other Associations (Contains, Like) */}
                        {['contains', 'like'].map(type => {
                            const linksOfType = existingLinks.filter(l => l.linkType?.toLowerCase() === type.toLowerCase());
                            if (linksOfType.length === 0) return null;

                            return (
                                <View key={type} style={styles.relationSection}>
                                    <View style={styles.relationHeaderRow}>
                                        <Text style={styles.relationHeader}>{type.toUpperCase()}</Text>
                                        <IconButton 
                                            icon="pencil-outline" 
                                            size={16} 
                                            onPress={() => router.push({
                                                pathname: '/utilities/instagram/manage-associations',
                                                params: { id: localItem.id, type }
                                            } as any)}
                                        />
                                    </View>

                                    <ScrollView 
                                        horizontal 
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.horizontalScroll}
                                    >
                                        {linksOfType.map(link => (
                                            <View key={link.id} style={styles.relatedTileWrapper}>
                                                <ProductTile 
                                                    item={{ 
                                                        id: link.productId, 
                                                        title: link.productTitle, 
                                                        productCode: link.productCode || '---',
                                                        vendorPrice: link.vendorPrice || 0,
                                                        media: Array.isArray(link.media) ? link.media : (link.mediaJson ? JSON.parse(link.mediaJson) : []),
                                                        masterProductId: '' 
                                                    } as any} 
                                                    onPress={(p) => router.push(`/product/${p.id}` as any)} 
                                                    sizeRatio={0.45} 
                                                />
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            );
                        })}
                        
                        <View style={styles.bottomActions}>
                            <Button 
                                mode="outlined" 
                                icon="cog-outline" 
                                onPress={() => router.push({
                                    pathname: '/utilities/instagram/link-product',
                                    params: { id: localItem.id, data: JSON.stringify(localItem), allowedTypes: 'contains,like' }
                                } as any)}
                                style={styles.manageAssociationsBtn}
                            >
                                Manage Associations
                            </Button>
                        </View>
                        </ScrollView>
                    </Animated.View>
                </GestureDetector>
            </View>

            <Portal>
                <Dialog visible={isUnlinking} onDismiss={() => setIsUnlinking(false)}>
                    <Dialog.Title>Unlink Product</Dialog.Title>
                    <Dialog.Content><Text>Are you sure you want to remove this product association?</Text></Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setIsUnlinking(false)}>Cancel</Button>
                        <Button 
                            textColor={theme.colors.error} 
                            loading={processingUnlink}
                            disabled={processingUnlink}
                            onPress={async () => {
                                if (!linkedProductDetails?.id) return;
                                try {
                                    setProcessingUnlink(true);
                                    await instagramService.unlinkInstagramPostAsync(localItem.id, linkedProductDetails.id);
                                    setLinkedProductDetails(null); // Clear local state immediately
                                    setHasFetchedLinks(false); // Force refresh associations
                                    setHasFetched(false); // Force refresh general post data
                                    setIsUnlinking(false);
                                } catch (err: any) {
                                    console.error('Unlink failed', err);
                                    Alert.alert('Unlink Failed', err.message || 'An unexpected error occurred.');
                                } finally {
                                    setProcessingUnlink(false);
                                }
                            }}
                        >
                            Unlink
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog visible={isRefreshingMedia} dismissable={false}>
                    <Dialog.Title>Refreshing Media</Dialog.Title>
                    <Dialog.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                            <ActivityIndicator color={theme.colors.primary} style={{ marginRight: 15 }} />
                            <Text style={{ flex: 1 }}>Updating media status...</Text>
                        </View>
                    </Dialog.Content>
                </Dialog>

                <Dialog visible={isSyncingComments} dismissable={false}>
                    <Dialog.Title>Syncing Comments</Dialog.Title>
                    <Dialog.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                            <ActivityIndicator color={theme.colors.primary} style={{ marginRight: 15 }} />
                            <Text style={{ flex: 1 }}>Fetching comments from Meta Graph API...</Text>
                        </View>
                    </Dialog.Content>
                </Dialog>

                <Dialog visible={isLoadingConfigs} dismissable={false}>
                    <Dialog.Title>Loading Accounts</Dialog.Title>
                    <Dialog.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                            <ActivityIndicator color={theme.colors.primary} style={{ marginRight: 15 }} />
                            <Text style={{ flex: 1 }}>Retrieving available Meta credentials...</Text>
                        </View>
                    </Dialog.Content>
                </Dialog>

                <Dialog visible={isTokenSelectionVisible} onDismiss={() => setIsTokenSelectionVisible(false)}>
                    <Dialog.Title>Select Meta Account</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.dialogToggleRow}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Icon source="database-sync-outline" size={20} color={theme.colors.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text variant="labelLarge" style={styles.bold}>Deep Sync (Full Scan)</Text>
                                    <Text variant="bodySmall" style={{ opacity: 0.6 }}>Forces comments refresh, bypassing optimizations</Text>
                                </View>
                            </View>
                            <Switch 
                                value={isDeepSync} 
                                onValueChange={(val) => setIsDeepSync(val)} 
                                color={theme.colors.primary}
                            />
                        </View>
                        <Divider style={{ marginVertical: 12 }} />

                        <ScrollView style={{ maxHeight: 250 }}>
                            {availableConfigs.map((config, idx) => (
                                <React.Fragment key={config.id || idx}>
                                    <List.Item
                                        title={config.name || 'Unnamed Account'}
                                        description={`App ID: ${config.appId ? config.appId.substring(0, 8) + '...' : 'N/A'}${config.isDefault ? ' (Default)' : ''}`}
                                        left={props => <List.Icon {...props} icon="account" />}
                                        right={props => config.isDefault ? <List.Icon {...props} icon="star" color="#FFD700" /> : null}
                                        onPress={() => executeSyncComments(config.longAccessToken)}
                                        style={styles.configListItem}
                                    />
                                    {idx < availableConfigs.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setIsTokenSelectionVisible(false)}>Cancel</Button>
                    </Dialog.Actions>
                </Dialog>

                {/* Menu Sheet inside the same Portal */}
                {isMenuVisible && (
                    <View style={StyleSheet.absoluteFill}>
                        <TouchableOpacity 
                            style={styles.menuBackdrop} 
                            activeOpacity={1} 
                            onPress={() => {
                                menuSheetTop.value = withSpring(MENU_HIDDEN);
                                setTimeout(() => setIsMenuVisible(false), 300);
                            }}
                        />
                        <GestureDetector gesture={menuPanGesture}>
                            <Animated.View style={[styles.menuSheet, menuAnimatedStyle]}>
                                <View style={styles.dragHandleContainer}>
                                    <View style={styles.dragHandle} />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text variant="titleLarge" style={styles.menuTitle}>Post Actions</Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.menuItem}
                                        onPress={() => postDetailsRefresh()}
                                    >
                                        <IconButton icon="sync" size={24} iconColor={theme.colors.primary} />
                                        <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>Refresh Data</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.menuItem}
                                        onPress={handleSyncComments}
                                    >
                                        <IconButton icon="comment-sync-outline" size={24} iconColor={theme.colors.primary} />
                                        <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>Sync Comments</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.menuItem}
                                        disabled={downloadProgress !== null}
                                        onPress={async () => {
                                            try {
                                                const activeMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
                                                const url = getMediaUri(activeMedia);
                                                const path = activeMedia.storagePath || '';
                                                const extension = path.split('.').pop()?.toLowerCase() || (isVideo(activeMedia) ? 'mp4' : 'jpg');
                                                
                                                setDownloadProgress(0);
                                                await downloadMedia(url, `ig_${activeMedia.id || Date.now()}.${extension}`, (p) => {
                                                    setDownloadProgress(p);
                                                });
                                                
                                                setDownloadProgress(null);
                                                Alert.alert('Success', 'Media saved to gallery!');
                                                setIsMenuVisible(false);
                                                menuSheetTop.value = withSpring(MENU_HIDDEN);
                                            } catch {
                                                setDownloadProgress(null);
                                                Alert.alert('Download Failed', 'Could not download media.');
                                            }
                                        }}
                                    >
                                        <IconButton 
                                            icon={downloadProgress !== null ? "loading" : "download"} 
                                            size={24} 
                                            iconColor={theme.colors.primary} 
                                        />
                                        <Text variant="bodyLarge" style={{ color: theme.colors.primary, flex: 1 }}>
                                            {downloadProgress !== null 
                                                ? `Downloading (${Math.round(downloadProgress * 100)}%)` 
                                                : `Download ${isVideo(mediaLinks[activeMediaIndex] || localItem) ? 'Video' : 'Photo'}`}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.menuItem}
                                        disabled={shareProgress !== null || downloadProgress !== null}
                                        onPress={async () => {
                                            try {
                                                const activeMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
                                                const url = getMediaUri(activeMedia);
                                                const path = activeMedia.storagePath || '';
                                                const extension = path.split('.').pop()?.toLowerCase() || (isVideo(activeMedia) ? 'mp4' : 'jpg');
                                                
                                                setShareProgress(0);
                                                await shareMedia(url, extension, (p) => {
                                                    setShareProgress(p);
                                                });
                                                
                                                setShareProgress(null);
                                                setIsMenuVisible(false);
                                                menuSheetTop.value = withSpring(MENU_HIDDEN);
                                            } catch {
                                                setShareProgress(null);
                                                Alert.alert('Sharing Failed', 'Could not prepare media for sharing.');
                                            }
                                        }}
                                    >
                                        <IconButton 
                                            icon={shareProgress !== null ? "loading" : "share-variant"} 
                                            size={24} 
                                            iconColor={theme.colors.primary} 
                                        />
                                        <Text variant="bodyLarge" style={{ color: theme.colors.primary, flex: 1 }}>
                                            {shareProgress !== null 
                                                ? `Preparing (${Math.round(shareProgress * 100)}%)` 
                                                : `Share ${isVideo(mediaLinks[activeMediaIndex] || localItem) ? 'Video' : 'Photo'}`}
                                        </Text>
                                    </TouchableOpacity>

                                    {(() => {
                                        const currentMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
                                        const isCurrentVideo = isVideo(currentMedia);
                                        
                                        if (!isCurrentVideo) return null;

                                        return (
                                            <TouchableOpacity 
                                                style={styles.menuItem}
                                                onPress={async () => {
                                                    try {
                                                        setIsMenuVisible(false);
                                                        menuSheetTop.value = withSpring(MENU_HIDDEN);
                                                        
                                                        // Prepare defaults
                                                        setIsYoutubeDialogVisible(true);
                                                        youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_VISIBLE);
                                                    } catch {
                                                        Alert.alert('Error', 'Could not prepare YouTube upload.');
                                                    }
                                                }}
                                            >
                                                <IconButton 
                                                    icon="youtube" 
                                                    size={24} 
                                                    iconColor='#FF0000' 
                                                />
                                                <Text variant="bodyLarge" style={{ color: '#FF0000', flex: 1 }}>
                                                    {localItem.youtubeUrl ? 'Repost to YouTube' : 'Post to YouTube Shorts'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })()}

                                    {localItem.youtubeUrl && (
                                        <TouchableOpacity 
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setIsMenuVisible(false);
                                                menuSheetTop.value = withSpring(MENU_HIDDEN);
                                                Linking.openURL(localItem.youtubeUrl!);
                                            }}
                                        >
                                            <IconButton 
                                                icon="open-in-new" 
                                                size={24} 
                                                iconColor="#007AFF" 
                                            />
                                            <Text variant="bodyLarge" style={{ color: '#007AFF', flex: 1 }}>
                                                View on YouTube
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity 
                                        style={[styles.menuItem, { marginTop: 10 }]}
                                        onPress={() => {
                                            menuSheetTop.value = withSpring(MENU_HIDDEN);
                                            setTimeout(() => setIsMenuVisible(false), 300);
                                        }}
                                    >
                                        <IconButton icon="close" size={24} iconColor={theme.colors.error} />
                                        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        </GestureDetector>
                    </View>
                )}

                {isYoutubeDialogVisible && (
                    <View style={StyleSheet.absoluteFill}>
                        <TouchableOpacity 
                            style={[styles.menuBackdrop, { zIndex: 350 }]} 
                            activeOpacity={1} 
                            onPress={handleYoutubeCancel}
                        />
                        <GestureDetector gesture={youtubePanGesture}>
                            <Animated.View style={[styles.youtubeSheet, youtubeAnimatedStyle]}>
                                <View style={styles.dragHandleContainer}>
                                    <View style={styles.dragHandle} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <YoutubeShortsScheduleForm 
                                        mediaId={resolveYoutubeMediaId()}
                                        initialTitle={localItem.productCode || ''}
                                        initialDescription={localItem.caption || ''}
                                        videoUri={resolveYoutubeVideoUri()}
                                        onSuccess={handleYoutubeSuccess}
                                        onBusyChange={setIsYoutubeBusy}
                                        onCancel={handleYoutubeCancel}
                                    />
                                </View>
                            </Animated.View>
                        </GestureDetector>
                    </View>
                )}

                <InstagramCommentsModal
                    visible={isCommentsModalVisible}
                    onDismiss={() => setIsCommentsModalVisible(false)}
                    postId={localItem.id}
                    commentCount={localItem.commentCount || 0}
                    onSyncPress={() => {
                        setIsCommentsModalVisible(false);
                        handleSyncComments();
                    }}
                />
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    mediaContainer: {
    },
    carouselIndicators: {
        position: 'absolute',
        top: 60, // Positioned below the top menu button
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 110,
    },
    dotsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: '#000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        gap: 6,
    },
    badgeContainer: {
        position: 'absolute',
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: 'black',
        fontSize: 10,
        fontWeight: 'bold',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.3)',
    },
    activeDot: {
        backgroundColor: 'black',
        width: 12,
    },
    inactiveDot: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    actionColumn: {
        position: 'absolute',
        top: height * 0.15,
        right: 12,
        alignItems: 'center',
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statIcon: {
        margin: 0,
    },
    productCodeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 1)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
        elevation: 2, // Helps on Android for shadow rendering
    },
    topMenuContainer: {
        position: 'absolute',
        right: 10,
        zIndex: 200,
    },
    menuTrigger: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topLeftIconContainer: {
        position: 'absolute',
        left: 10,
        zIndex: 200,
    },
    youtubeFloatingBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        zIndex: 300,
        minHeight: height * 0.4,
    },
    youtubeSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: height * 0.1,
        backgroundColor: 'white',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        zIndex: 400,
    },
    youtubeSheetContent: {
        padding: 20,
        flex: 1,
    },
    menuContent: {
        padding: 20,
    },
    menuTitle: {
        marginBottom: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    statText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -10,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: -1, height: 1},
        textShadowRadius: 10
    },
    detailsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        paddingHorizontal: 20,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
        overflow: 'hidden',
    },
    dragHandleContainer: {
        width: '100%',
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
    },
    captionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingBottom: 4,
    },
    captionContent: {
        flex: 1,
    },
    caption: {
        color: '#666',
        lineHeight: 20,
    },
    captionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -4,
    },
    captionActionIcon: {
        margin: 0,
        padding: 0,
        width: 36,
        height: 36,
    },
    sectionTitle: {
        fontWeight: 'bold',
    },
    previewTileWrapper: {
        marginTop: 12,
        marginBottom: 8,
    },
    primaryProductContainer: {
        marginTop: 8,
    },
    emptyText: {
        opacity: 0.4,
        fontStyle: 'italic',
        marginBottom: 16,
        textAlign: 'center',
    },
    relatedTileWrapper: {
        marginRight: 12,
    },
    horizontalScroll: {
        paddingRight: 20,
    },
    relationSection: {
        marginTop: 8,
        marginBottom: 8,
    },
    relationHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 8,
    },
    relationHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        letterSpacing: 1,
    },
    primaryHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inlineActionIcon: {
        margin: 0,
    },
    bottomActions: {
        marginTop: 24,
        marginBottom: 60,
        gap: 12,
    },
    manageAssociationsBtn: {
        borderRadius: 12,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    typeBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    scheduleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    dateInput: {
        flex: 1.2,
    },
    timeInput: {
        flex: 1,
    },
    scheduleInputText: {
        fontSize: 15,
    },
    scheduleInputContent: {
        paddingHorizontal: 8,
    },
    scheduleIcon: {
        marginRight: -8,
    },
    helperText: {
        opacity: 0.6,
        marginBottom: 12,
        marginLeft: 4,
    },
    configListItem: {
        paddingVertical: 4,
        borderRadius: 8,
        marginVertical: 2,
    },
    dialogToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    bold: {
        fontWeight: 'bold',
    },
});
