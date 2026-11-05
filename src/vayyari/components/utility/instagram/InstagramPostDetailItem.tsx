import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Linking, FlatList, ScrollView, ActivityIndicator, Alert, useWindowDimensions, Modal } from 'react-native';
import { Text, IconButton, useTheme, Button, Portal, Dialog, List, Divider, Icon } from 'react-native-paper';
import { ToggleSwitch } from '@/components/tamagui-ui/atoms/ToggleSwitch';
import { YStack, XStack, Text as TamaguiText } from 'tamagui';
import { useTheme as useAppTheme } from '@/theme';
import {
    LuEllipsisVertical,
    LuViewfinderLens,
    LuRefreshCw,
    LuMessageCircle,
    LuDownload,
    LuShare2,
    LuYoutube,
    LuExternalLink,
    LuTrash2,
} from '@/components/tamagui-ui/icons/lu';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useFocusEffect } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { EdgeInsets } from 'react-native-safe-area-context';
import { instagramService, InstagramPost } from '@/services/instagram.service';
import { productService } from '@/services/productService';
import { ProductTile } from '@/components/utility/product/ProductTile';
import type { VendorProduct } from '@/types/products';
import { InstagramVideoPlayer } from './InstagramVideoPlayer';
import { YoutubeShortsScheduleForm } from '../youtube/YoutubeShortsScheduleForm';
import { InstagramLink, normalizeData, isVideo, getMediaUri, getBaseId, getInstagramPostUrl, openInstagramPost } from '@/utils/instagram-helpers';
import { downloadMedia, shareMedia } from '@/utils/media-helpers';
import { InstagramCommentsModal } from './InstagramCommentsModal';
import { CompetitorSparkline } from './CompetitorSparkline';
import { InstagramMediaFocusModal } from './InstagramMediaFocusModal';

const { width: defaultWidth, height: defaultHeight } = Dimensions.get('window');

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
    itemHeight?: number;
    itemWidth?: number;
    onDraggingStateChange?: (dragging: boolean) => void;
    onPostUpdated?: (updatedPost: InstagramPost) => void;
}

const isFullVideoDownloaded = (
    m?: InstagramPost | null,
    links: InstagramPost[] = [],
    rootItem?: InstagramPost | null
): boolean => {
    if (!m) return false;
    if (m.isFullMediaDownloaded === true || rootItem?.isFullMediaDownloaded === true) return true;
    if (m.storagePath) {
        const path = m.storagePath.toLowerCase();
        if (path.endsWith('.mp4') || path.endsWith('.mov')) return true;
    }
    const isMediaVideo = isVideo(m) || m.mediaType === 'VIDEO' || (m.mediaType as any) === 2 || (m.mediaType as any) === 10;
    if (isMediaVideo && links && links.length > 0) {
        const hasVideoInLinks = links.some(link => {
            const lPath = (link.storagePath || '').toLowerCase();
            const lType = link.mediaType;
            return lPath.endsWith('.mp4') || 
                   lPath.endsWith('.mov') || 
                   lType === 'VIDEO' || 
                   (lType as any) === 2 || 
                   (lType as any) === 10 || 
                   link.isFullMediaDownloaded === true;
        });
        if (hasVideoInLinks) return true;
    }
    if (m.isFullMediaDownloaded === false && !rootItem?.isFullMediaDownloaded) return false;
    return false;
};

const resolveVideoMedia = (
    media: InstagramPost,
    links: InstagramPost[] = [],
    rootItem?: InstagramPost
): InstagramPost => {
    if (!isVideo(media) && media.mediaType !== 'VIDEO' && (media.mediaType as any) !== 2) {
        return media;
    }
    const mediaPath = (media.storagePath || '').toLowerCase();
    if (mediaPath.endsWith('.mp4') || mediaPath.endsWith('.mov')) {
        return media;
    }

    // Look for matching video in links
    const matchingLink = links.find(l => {
        const p = (l.storagePath || '').toLowerCase();
        return (p.endsWith('.mp4') || p.endsWith('.mov')) && 
               (getBaseId(p) === getBaseId(media.storagePath || '') || links.length === 1);
    }) || links.find(l => {
        const p = (l.storagePath || '').toLowerCase();
        return p.endsWith('.mp4') || p.endsWith('.mov');
    }) || (rootItem && ((rootItem.storagePath || '').toLowerCase().endsWith('.mp4') || (rootItem.storagePath || '').toLowerCase().endsWith('.mov')) ? rootItem : null);

    if (matchingLink && matchingLink.storagePath) {
        return {
            ...media,
            storagePath: matchingLink.storagePath,
            isFullMediaDownloaded: true,
        };
    }

    return media;
};

const formatMetricNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
};

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
    itemHeight: propItemHeight,
    itemWidth: propItemWidth,
    onDraggingStateChange,
    onPostUpdated
}: PostDetailItemProps) => {
    const theme = useTheme();
    const { tokens } = useAppTheme();
    const router = useRouter();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const currentWidth = propItemWidth || windowWidth || defaultWidth;
    const currentHeight = propItemHeight || windowHeight || defaultHeight;

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
    const [isFocusModalVisible, setIsFocusModalVisible] = useState(false);
    const [isRefreshingMedia, setIsRefreshingMedia] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [shareProgress, setShareProgress] = useState<number | null>(null);
    const [localItem, setLocalItem] = useState(item);
    const [mediaErrors, setMediaErrors] = useState<{ [key: string]: boolean }>({});
    const [retryKeys, setRetryKeys] = useState<{ [key: string]: number }>({});
    const [isMarkDeletedDialogVisible, setIsMarkDeletedDialogVisible] = useState(false);
    const [isMarkingDeleted, setIsMarkingDeleted] = useState(false);

    const handleRetryMedia = useCallback((mediaKey: string) => {
        setMediaErrors(prev => ({ ...prev, [mediaKey]: false }));
        setRetryKeys(prev => ({ ...prev, [mediaKey]: (prev[mediaKey] || 0) + 1 }));
    }, []);

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

    // Competitor Trajectory Tab State (Views, Likes, Comments)
    const [activeMetricTab, setActiveMetricTab] = useState<'views' | 'likes' | 'comments'>('views');

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
            setMediaErrors({});
            setRetryKeys({});
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
    const COLLAPSED_SHEET_HEIGHT = Math.max(140, Math.min(190, currentHeight * 0.22)) + (insets.bottom || 0);
    const START_TOP = currentHeight - COLLAPSED_SHEET_HEIGHT;
    const END_TOP = insets.top + 60;
    const sheetTop = useSharedValue(START_TOP);
    const startTopSV = useSharedValue(START_TOP);
    const endTopSV = useSharedValue(END_TOP);

    useEffect(() => {
        startTopSV.value = START_TOP;
        endTopSV.value = END_TOP;
        if (!isExpanded) {
            sheetTop.value = START_TOP;
        } else {
            sheetTop.value = END_TOP;
        }
    }, [START_TOP, END_TOP, isExpanded]);

    // Menu Sheet Logic
    const MENU_HIDDEN = 500;
    const MENU_VISIBLE = 0;
    const menuSheetTop = useSharedValue(MENU_HIDDEN);
    
    // YouTube Sheet Logic
    const YOUTUBE_SHEET_HIDDEN = currentHeight;
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
        const resolvedCurrent = resolveVideoMedia(currentMedia, mediaLinks, localItem);
        if (isVideo(resolvedCurrent) && !(resolvedCurrent.storagePath || '').toLowerCase().endsWith('.jpg')) {
            return resolvedCurrent.id;
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
        const resolvedCurrent = resolveVideoMedia(currentMedia, mediaLinks, localItem);
        if (isVideo(resolvedCurrent) && !(resolvedCurrent.storagePath || '').toLowerCase().endsWith('.jpg')) {
            return getMediaUri(resolvedCurrent);
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

            const normalizedLinks = filteredLinks.map(normalizeData);
            setMediaLinks(normalizedLinks);

            // When fetchMedia runs, if mediaLinks contains the full .mp4 video,
            // make sure mediaLinks replaces/updates localItem so that InstagramVideoPlayer receives the valid video stream URI.
            const allFetched = (links || []).map(normalizeData);
            const fullVideoEntry = normalizedLinks.find(l => {
                const p = (l.storagePath || '').toLowerCase();
                return p.endsWith('.mp4') || p.endsWith('.mov') || l.isFullMediaDownloaded === true;
            }) || allFetched.find(l => {
                const p = (l.storagePath || '').toLowerCase();
                return p.endsWith('.mp4') || p.endsWith('.mov') || l.isFullMediaDownloaded === true;
            });

            if (fullVideoEntry && (isVideo(localItem) || isVideo(fullVideoEntry))) {
                setLocalItem(prev => ({
                    ...prev,
                    ...fullVideoEntry,
                    caption: prev.caption || fullVideoEntry.caption,
                    likeCount: prev.likeCount ?? fullVideoEntry.likeCount,
                    commentCount: prev.commentCount ?? fullVideoEntry.commentCount,
                    storagePath: fullVideoEntry.storagePath || prev.storagePath,
                    isFullMediaDownloaded: true,
                }));
            }

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
        return currentWidth / ratio;
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
            sheetTop.value = Math.max(endTopSV.value, Math.min(startTopSV.value, context.value + e.translationY));
            if (!hasFetchedLinksSV.value && sheetTop.value < startTopSV.value - 100) {
                hasFetchedLinksSV.value = true;
                runOnJS(fetchLinks)();
            }
        })
        .onEnd((e) => {
            if (onDraggingStateChange) {
                runOnJS(onDraggingStateChange)(false);
            }
            if (e.translationY > 150 || e.velocityY > 1000) {
                sheetTop.value = withSpring(startTopSV.value, { velocity: e.velocityY });
                runOnJS(setIsExpanded)(false);
            } else if (e.translationY < -150 || e.velocityY < -1000) {
                sheetTop.value = withSpring(endTopSV.value, { velocity: e.velocityY });
                runOnJS(setIsExpanded)(true);
            } else {
                // Determine snap point based on current position instead of JS state
                const snapPoint = sheetTop.value < (startTopSV.value + endTopSV.value) / 2 ? endTopSV.value : startTopSV.value;
                sheetTop.value = withSpring(snapPoint);
                runOnJS(setIsExpanded)(snapPoint === endTopSV.value);
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
        height: currentHeight - endTopSV.value,
    }));

    const menuAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: menuSheetTop.value }],
    }));

    const youtubeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: youtubeSheetTop.value }],
    }));

    // Prioritize fetched linked details, but fall back to localItem.productCode only if we haven't confirmed it's gone
    const productCodeToDisplay = linkedProductDetails?.productCode || (!hasFetchedLinks ? localItem.productCode : null);

    const profileCategory = (localItem.profileCategory || (item as any)?.profileCategory || '')?.toLowerCase();
    const isCompetitor = Boolean(
        localItem.isCompetitor ||
        (item as any)?.isCompetitor ||
        profileCategory === 'competitors' ||
        profileCategory === 'competitor' ||
        (localItem.multiplier !== undefined && localItem.multiplier > 1) ||
        ((item as any)?.multiplier !== undefined && (item as any)?.multiplier > 1)
    );

    const competitorMultiplier = localItem.multiplier || (localItem.likeCount > 5000 ? 3.4 : localItem.likeCount > 2000 ? 2.6 : 1.8);
    const isTakeoff = competitorMultiplier >= 2.5;

    return (
        <View style={{ width: currentWidth, height: currentHeight, backgroundColor: theme.colors.background }}>
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

                        {/* Competitor Performance Trajectory Curve & Velocity Overlay */}
                        {isCompetitor && (
                            <View style={[styles.competitorOverlayContainer, { top: insets.top + (localItem.youtubeUrl ? 112 : 60) }]}>
                                <View style={styles.competitorOverlayPill}>
                                    <Text style={styles.competitorVelocityText}>
                                        {isTakeoff ? '⚡' : '🔥'} {competitorMultiplier.toFixed(1)}x
                                    </Text>
                                    <Text style={styles.competitorOutlierTag}>
                                        {localItem.outlierType === 'day_one_takeoff' ? 'Day-1 Takeoff' : 'Breakout'}
                                    </Text>
                                </View>
                                <CompetitorSparkline
                                    points={localItem.curvePoints}
                                    width={120}
                                    height={46}
                                    multiplier={competitorMultiplier}
                                    showMetricSelector={false}
                                />
                            </View>
                        )}

                        <View style={[styles.topMenuContainer, { top: insets.top + 10 }]}>
                            {/* Focus Preview & Visual Lens Button (Neon Cyan Touch) */}
                            <TouchableOpacity 
                                accessibilityRole="button"
                                accessibilityLabel="Focus preview and visual lens"
                                activeOpacity={0.7}
                                onPress={() => setIsFocusModalVisible(true)}
                            >
                                <XStack
                                    width={36}
                                    height={36}
                                    borderRadius={18}
                                    backgroundColor="rgba(15, 23, 42, 0.75)"
                                    borderWidth={1.5}
                                    borderColor="#06B6D4"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Icon source="camera-iris" size={18} color="#22D3EE" />
                                </XStack>
                            </TouchableOpacity>

                            {/* 3-Dots Context Menu Button (Catalog PDP Style) */}
                            <TouchableOpacity 
                                accessibilityRole="button"
                                accessibilityLabel="Open post options menu"
                                activeOpacity={0.7}
                                onPress={() => setIsMenuVisible(true)}
                            >
                                <XStack
                                    width={36}
                                    height={36}
                                    borderRadius={18}
                                    backgroundColor="rgba(0,0,0,0.55)"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <LuEllipsisVertical size={16} color="#ffffff" />
                                </XStack>
                            </TouchableOpacity>
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
                            const index = Math.round(e.nativeEvent.contentOffset.x / currentWidth);
                            setActiveMediaIndex(index);
                        }}
                        renderItem={({ item: media, index: mediaIdx }) => {
                            const mHeight = getMediaHeight();
                            const isPlayerActive = isActive && mediaIdx === activeMediaIndex;
                            const isMediaVideo = isVideo(media);
                            const isVideoDownloaded = isMediaVideo && isFullVideoDownloaded(media, mediaLinks, localItem);
                            const playbackMedia = isMediaVideo ? resolveVideoMedia(media, mediaLinks, localItem) : media;
                            const shouldPlayVideo = isMediaVideo && !isCompetitor && isVideoDownloaded;

                            const mediaKey = media.id || `media_${mediaIdx}`;
                            const hasMediaError = Boolean(mediaErrors[mediaKey]);
                            const retryCount = retryKeys[mediaKey] || 0;

                            const rawCoverUri = getMediaUri(media, 'large') || media.thumbnailUrl || media.mediaUrl;
                            const coverUri = rawCoverUri && retryCount > 0
                                ? `${rawCoverUri}${rawCoverUri.includes('?') ? '&' : '?'}retry=${retryCount}`
                                : rawCoverUri;

                            const handleOpenInInstagram = () => {
                                openInstagramPost(media);
                            };

                            return (
                                <View key={media.id || mediaIdx} style={{ width: currentWidth, height: START_TOP - insets.top, justifyContent: 'center' }}>
                                    {shouldPlayVideo ? (
                                        <InstagramVideoPlayer 
                                            media={playbackMedia}
                                            width={currentWidth}
                                            getMediaHeight={getMediaHeight}
                                            isMuted={isMuted}
                                            setIsMuted={setIsMuted}
                                            volume={volume}
                                            setVolume={setVolume}
                                            isPlaying={isPlaying}
                                            isActive={isPlayerActive}
                                        />
                                    ) : hasMediaError ? (
                                        <View style={[styles.placeholderContainer, { width: currentWidth, height: mHeight, backgroundColor: theme.colors.surfaceVariant }]}>
                                            <Icon source="image-broken-variant" size={44} color={theme.colors.onSurfaceVariant} />
                                            <Text variant="bodyMedium" style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}>
                                                Media unavailable
                                            </Text>
                                            <View style={styles.placeholderActionsRow}>
                                                <Button 
                                                    mode="contained-tonal" 
                                                    icon="reload" 
                                                    compact
                                                    onPress={() => handleRetryMedia(mediaKey)}
                                                    style={styles.retryButton}
                                                >
                                                    Retry
                                                </Button>
                                                <Button 
                                                    mode="outlined" 
                                                    icon="instagram" 
                                                    compact
                                                    onPress={handleOpenInInstagram}
                                                    style={styles.openInInstaFallbackButton}
                                                >
                                                    Instagram
                                                </Button>
                                            </View>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            activeOpacity={0.95}
                                            onPress={() => setIsFocusModalVisible(true)}
                                            style={{ width: currentWidth, height: mHeight, justifyContent: 'center', alignItems: 'center', position: 'relative' }}
                                        >
                                            <Image 
                                                source={{ uri: coverUri }} 
                                                style={{ width: currentWidth, height: mHeight }}
                                                contentFit="cover"
                                                onLoad={(e) => {
                                                    const ratio = e.source.width / e.source.height;
                                                    if (ratio > 0) {
                                                        setMediaAspectRatios(prev => ({ ...prev, [media.id || 'initial']: ratio }));
                                                    }
                                                }}
                                                onError={() => {
                                                    setMediaErrors(prev => ({ ...prev, [mediaKey]: true }));
                                                }}
                                            />
                                            <View style={styles.mediaFocusPill} pointerEvents="none">
                                                <Icon source="camera-iris" size={13} color="#FFFFFF" />
                                                <Text style={styles.mediaFocusPillText}>Focus · Lens</Text>
                                            </View>
                                            {(isMediaVideo || isCompetitor) && (
                                                <View style={styles.thumbnailVideoOverlay}>
                                                    <TouchableOpacity 
                                                        activeOpacity={0.85}
                                                        onPress={handleOpenInInstagram}
                                                        style={styles.openInInstaOverlayBtn}
                                                    >
                                                        <View style={styles.playIconContainer}>
                                                            <Icon source={isMediaVideo ? "play" : "instagram"} size={32} color="#FFFFFF" />
                                                        </View>
                                                        <View style={styles.openInInstaBadge}>
                                                            <Icon source="instagram" size={16} color="#FFFFFF" />
                                                            <Text style={styles.openInInstaBadgeText}>Open in Instagram</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </TouchableOpacity>
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

                    {/* Deleted on Instagram overlay banner */}
                    {localItem.deletedOnInstagram && (
                        <View style={styles.deletedOverlayBanner} pointerEvents="none">
                            <Icon source="delete-alert" size={18} color="#fff" />
                            <Text style={styles.deletedOverlayText}>DELETED ON INSTAGRAM</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.actionColumn, { top: insets.top + 60 }]}>
                    <View style={styles.statItem}>
                        <IconButton icon="eye" iconColor="white" size={24} style={styles.statIcon} />
                        <Text style={styles.statText}>
                            {((localItem?.viewCount) || (localItem?.likeCount ? localItem.likeCount * 7 : 0)).toLocaleString()}
                        </Text>
                    </View>
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
                    <IconButton icon="open-in-new" iconColor="white" size={24} onPress={() => openInstagramPost(localItem)} />
                    <IconButton icon="link-variant" iconColor="white" size={24} onPress={async () => {
                        const postUrl = getInstagramPostUrl(localItem);
                        if (postUrl) await Clipboard.setStringAsync(postUrl);
                    }} />
                </View>

                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.detailsContainer, animatedStyle, { paddingBottom: insets.bottom + 12 }]}>
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>
                        
                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                        >
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

                        {/* Competitor Enhanced Metrics & Performance Trajectory Card */}
                        {isCompetitor && (
                            <View style={[styles.competitorMetricsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                                <View style={styles.metricsCardHeader}>
                                    <View style={styles.metricsCardTitleRow}>
                                        <Icon source="trending-up" size={18} color={theme.colors.primary} />
                                        <Text variant="titleSmall" style={[styles.metricsCardTitle, { color: theme.colors.onSurfaceVariant }]}>
                                            Performance & Trajectory
                                        </Text>
                                    </View>
                                    <View style={[styles.multiplierBadgeDetail, { backgroundColor: isTakeoff ? '#FEF3C7' : '#FEE2E2' }]}>
                                        <Text style={{ color: isTakeoff ? '#B45309' : '#B91C1C', fontWeight: '800', fontSize: 11 }}>
                                            ⚡ {competitorMultiplier.toFixed(1)}x Baseline
                                        </Text>
                                    </View>
                                </View>

                                {/* 3 Parameters Metric Selector Tiles */}
                                <View style={styles.metricTabsContainer}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => setActiveMetricTab('views')}
                                        style={[
                                            styles.metricTabTile,
                                            {
                                                backgroundColor: activeMetricTab === 'views' 
                                                    ? (theme.colors.elevation?.level3 || theme.colors.surface)
                                                    : 'transparent',
                                            }
                                        ]}
                                    >
                                        <View style={styles.metricTabHeader}>
                                            <Text variant="labelSmall" style={[styles.metricTabLabel, { color: '#3B82F6' }]}>
                                                👁️ Views
                                            </Text>
                                            {activeMetricTab === 'views' && <View style={[styles.activeDotIndicator, { backgroundColor: '#3B82F6' }]} />}
                                        </View>
                                        <Text variant="titleMedium" style={[styles.metricTabValue, { color: theme.colors.onSurface }]}>
                                            {formatMetricNumber(localItem.viewCount || (localItem.likeCount ? localItem.likeCount * 7 : 0))}
                                        </Text>
                                        <Text variant="labelSmall" style={styles.metricTabBaseline}>
                                            avg {formatMetricNumber(localItem.baselineAvgViews || Math.round((localItem.viewCount || (localItem.likeCount ? localItem.likeCount * 7 : 0)) / competitorMultiplier))}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => setActiveMetricTab('likes')}
                                        style={[
                                            styles.metricTabTile,
                                            {
                                                backgroundColor: activeMetricTab === 'likes' 
                                                    ? (theme.colors.elevation?.level3 || theme.colors.surface)
                                                    : 'transparent',
                                            }
                                        ]}
                                    >
                                        <View style={styles.metricTabHeader}>
                                            <Text variant="labelSmall" style={[styles.metricTabLabel, { color: isTakeoff ? '#F59E0B' : '#EF4444' }]}>
                                                ❤️ Likes
                                            </Text>
                                            {activeMetricTab === 'likes' && <View style={[styles.activeDotIndicator, { backgroundColor: isTakeoff ? '#F59E0B' : '#EF4444' }]} />}
                                        </View>
                                        <Text variant="titleMedium" style={[styles.metricTabValue, { color: theme.colors.onSurface }]}>
                                            {formatMetricNumber(localItem.likeCount || 0)}
                                        </Text>
                                        <Text variant="labelSmall" style={styles.metricTabBaseline}>
                                            avg {formatMetricNumber(localItem.baselineAvgLikes || Math.round((localItem.likeCount || 0) / competitorMultiplier))}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => setActiveMetricTab('comments')}
                                        style={[
                                            styles.metricTabTile,
                                            {
                                                backgroundColor: activeMetricTab === 'comments' 
                                                    ? (theme.colors.elevation?.level3 || theme.colors.surface)
                                                    : 'transparent',
                                            }
                                        ]}
                                    >
                                        <View style={styles.metricTabHeader}>
                                            <Text variant="labelSmall" style={[styles.metricTabLabel, { color: '#10B981' }]}>
                                                💬 Comments
                                            </Text>
                                            {activeMetricTab === 'comments' && <View style={[styles.activeDotIndicator, { backgroundColor: '#10B981' }]} />}
                                        </View>
                                        <Text variant="titleMedium" style={[styles.metricTabValue, { color: theme.colors.onSurface }]}>
                                            {formatMetricNumber(localItem.commentCount || 0)}
                                        </Text>
                                        <Text variant="labelSmall" style={styles.metricTabBaseline}>
                                            avg {formatMetricNumber(localItem.baselineAvgComments || Math.round((localItem.commentCount || 0) / competitorMultiplier))}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Trajectory Curve Chart with Baseline Comparison */}
                                <View style={styles.detailSparklineWrapper}>
                                    <CompetitorSparkline
                                        points={localItem.curvePoints}
                                        width={currentWidth - 72}
                                        height={80}
                                        multiplier={competitorMultiplier}
                                        dayNumber={localItem.dayNumber || 1}
                                        defaultMetric={activeMetricTab}
                                        showMetricSelector={false}
                                    />
                                </View>

                                {/* Trajectory Projection Info */}
                                <View style={styles.projectionInfoRow}>
                                    <View style={styles.projectionBadge}>
                                        <Text variant="labelSmall" style={styles.projectionLabel}>
                                            Projection:
                                        </Text>
                                        <Text variant="labelSmall" style={[styles.projectionValue, { color: theme.colors.primary }]}>
                                            {localItem.outlierType === 'day_one_takeoff' ? '⚡ Day-1 Viral Takeoff' : localItem.outlierType === 'delayed_spike' ? '📈 Delayed Spike' : '✨ Breakout Curve'}
                                        </Text>
                                    </View>
                                    <Text variant="labelSmall" style={styles.dayIndicator}>
                                        Day {localItem.dayNumber || 1}
                                    </Text>
                                </View>
                            </View>
                        )}

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
                            <ToggleSwitch 
                                checked={isDeepSync} 
                                onCheckedChange={(val) => setIsDeepSync(val)} 
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

                {/* Context Actions Menu Modal (Catalog PDP 3-dot Style) */}
                <Modal
                    visible={isMenuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsMenuVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                        onPress={() => setIsMenuVisible(false)}
                    >
                        <YStack
                            backgroundColor={tokens.surface}
                            borderTopLeftRadius={tokens.radius.xl}
                            borderTopRightRadius={tokens.radius.xl}
                            paddingVertical={12}
                            paddingHorizontal={16}
                            gap={2}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <XStack justifyContent="center" paddingBottom={8}>
                                <YStack width={36} height={4} borderRadius={2} backgroundColor={tokens.border} />
                            </XStack>

                            {/* Visual Catalog Lens */}
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Visual Catalog Lens"
                                activeOpacity={0.7}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    const activeMedia = (mediaLinks && mediaLinks[activeMediaIndex]) || localItem;
                                    const mediaUri = getMediaUri(activeMedia, 'large') || activeMedia.thumbnailUrl || activeMedia.mediaUrl;
                                    router.push({
                                        pathname: '/utilities/product-list',
                                        params: {
                                            visualImageUri: mediaUri || '',
                                            visualPostId: localItem.id,
                                            visualStoragePath: activeMedia.storagePath || '',
                                            visualMediaId: activeMedia.id && activeMedia.id !== localItem.id ? activeMedia.id : '',
                                        }
                                    } as any);
                                }}
                            >
                                <XStack alignItems="center" gap={12} paddingVertical={11}>
                                    <LuViewfinderLens size={18} color={tokens.accent} />
                                    <TamaguiText fontSize={14} fontWeight="700" color={tokens.accent}>
                                        Visual Catalog Lens (Find Similar)
                                    </TamaguiText>
                                </XStack>
                            </TouchableOpacity>

                            {/* Refresh Data */}
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Refresh Data"
                                activeOpacity={0.7}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    postDetailsRefresh();
                                }}
                            >
                                <XStack alignItems="center" gap={12} paddingVertical={11}>
                                    <LuRefreshCw size={18} color={tokens.text} />
                                    <TamaguiText fontSize={14} fontWeight="700" color={tokens.text}>
                                        Refresh Data
                                    </TamaguiText>
                                </XStack>
                            </TouchableOpacity>

                            {/* Sync Comments */}
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Sync Comments"
                                activeOpacity={0.7}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    handleSyncComments();
                                }}
                            >
                                <XStack alignItems="center" gap={12} paddingVertical={11}>
                                    <LuMessageCircle size={18} color={tokens.text} />
                                    <TamaguiText fontSize={14} fontWeight="700" color={tokens.text}>
                                        Sync Comments
                                    </TamaguiText>
                                </XStack>
                            </TouchableOpacity>

                            {/* Download Media */}
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Download Media"
                                activeOpacity={0.7}
                                disabled={downloadProgress !== null}
                                onPress={async () => {
                                    try {
                                        const rawMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
                                        const activeMedia = isVideo(rawMedia) ? resolveVideoMedia(rawMedia, mediaLinks, localItem) : rawMedia;
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
                                    } catch {
                                        setDownloadProgress(null);
                                        Alert.alert('Download Failed', 'Could not download media.');
                                    }
                                }}
                            >
                                <XStack alignItems="center" gap={12} paddingVertical={11}>
                                    <LuDownload size={18} color={tokens.text} />
                                    <TamaguiText fontSize={14} fontWeight="700" color={tokens.text}>
                                        {downloadProgress !== null
                                            ? `Downloading (${Math.round(downloadProgress * 100)}%)`
                                            : `Download ${isVideo(mediaLinks[activeMediaIndex] || localItem) ? 'Video' : 'Photo'}`}
                                    </TamaguiText>
                                </XStack>
                            </TouchableOpacity>

                            {/* Share Media */}
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Share Media"
                                activeOpacity={0.7}
                                disabled={shareProgress !== null || downloadProgress !== null}
                                onPress={async () => {
                                    try {
                                        const rawMedia = mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem;
                                        const activeMedia = isVideo(rawMedia) ? resolveVideoMedia(rawMedia, mediaLinks, localItem) : rawMedia;
                                        const url = getMediaUri(activeMedia);
                                        const path = activeMedia.storagePath || '';
                                        const extension = path.split('.').pop()?.toLowerCase() || (isVideo(activeMedia) ? 'mp4' : 'jpg');

                                        setShareProgress(0);
                                        await shareMedia(url, extension, (p) => {
                                            setShareProgress(p);
                                        });

                                        setShareProgress(null);
                                        setIsMenuVisible(false);
                                    } catch {
                                        setShareProgress(null);
                                        Alert.alert('Sharing Failed', 'Could not prepare media for sharing.');
                                    }
                                }}
                            >
                                <XStack alignItems="center" gap={12} paddingVertical={11}>
                                    <LuShare2 size={18} color={tokens.text} />
                                    <TamaguiText fontSize={14} fontWeight="700" color={tokens.text}>
                                        {shareProgress !== null
                                            ? `Preparing (${Math.round(shareProgress * 100)}%)`
                                            : `Share ${isVideo(mediaLinks[activeMediaIndex] || localItem) ? 'Video' : 'Photo'}`}
                                    </TamaguiText>
                                </XStack>
                            </TouchableOpacity>

                            {/* YouTube Shorts / Repost */}
                            {isVideo(mediaLinks.length > 0 ? mediaLinks[activeMediaIndex] : localItem) && (
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Post to YouTube"
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setIsMenuVisible(false);
                                        setIsYoutubeDialogVisible(true);
                                        youtubeSheetTop.value = withSpring(YOUTUBE_SHEET_VISIBLE);
                                    }}
                                >
                                    <XStack alignItems="center" gap={12} paddingVertical={11}>
                                        <LuYoutube size={18} color="#FF0000" />
                                        <TamaguiText fontSize={14} fontWeight="700" color="#FF0000">
                                            {localItem.youtubeUrl ? 'Repost to YouTube' : 'Post to YouTube Shorts'}
                                        </TamaguiText>
                                    </XStack>
                                </TouchableOpacity>
                            )}

                            {/* View on YouTube */}
                            {localItem.youtubeUrl && (
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="View on YouTube"
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setIsMenuVisible(false);
                                        Linking.openURL(localItem.youtubeUrl!);
                                    }}
                                >
                                    <XStack alignItems="center" gap={12} paddingVertical={11}>
                                        <LuExternalLink size={18} color="#007AFF" />
                                        <TamaguiText fontSize={14} fontWeight="700" color="#007AFF">
                                            View on YouTube
                                        </TamaguiText>
                                    </XStack>
                                </TouchableOpacity>
                            )}

                            {/* Mark / Restore Deleted on Instagram */}
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Toggle deleted status"
                                activeOpacity={0.7}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    setIsMarkDeletedDialogVisible(true);
                                }}
                            >
                                <XStack alignItems="center" gap={12} paddingVertical={11}>
                                    <LuTrash2 size={18} color="#EF4444" />
                                    <TamaguiText fontSize={14} fontWeight="700" color="#EF4444">
                                        {localItem.deletedOnInstagram ? 'Restore (Not Deleted)' : 'Mark as Deleted on Instagram'}
                                    </TamaguiText>
                                </XStack>
                            </TouchableOpacity>
                        </YStack>
                    </TouchableOpacity>
                </Modal>

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

                <InstagramMediaFocusModal
                    visible={isFocusModalVisible}
                    onClose={() => setIsFocusModalVisible(false)}
                    post={localItem}
                    mediaList={mediaLinks.length > 0 ? mediaLinks : [localItem]}
                    initialIndex={activeMediaIndex}
                    onOpenDedicatedLens={(selectedMedia) => {
                        setIsFocusModalVisible(false);
                        router.push({
                            pathname: '/utilities/instagram/visual-lens',
                            params: { 
                                id: localItem.id, 
                                data: JSON.stringify(localItem), 
                                mediaIndex: activeMediaIndex 
                            }
                        } as any);
                    }}
                    onPostUpdated={(updated) => {
                        fetchLinks(true);
                        onPostUpdated?.(updated);
                    }}
                />

                {/* Mark as Deleted on Instagram confirmation dialog */}
                <Dialog visible={isMarkDeletedDialogVisible} onDismiss={() => setIsMarkDeletedDialogVisible(false)}>
                    <Dialog.Title>
                        {localItem.deletedOnInstagram ? 'Restore Post' : 'Deleted on Instagram?'}
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text>
                            {localItem.deletedOnInstagram
                                ? 'Mark this post as still available on Instagram? It will reappear in the sharing list and collab planner.'
                                : 'Mark this post as deleted from Instagram? It will be hidden from the sharing list and collab planner, but still visible in the profile with a DELETED tag.'}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setIsMarkDeletedDialogVisible(false)}>Cancel</Button>
                        <Button
                            textColor={localItem.deletedOnInstagram ? theme.colors.primary : '#E53935'}
                            loading={isMarkingDeleted}
                            disabled={isMarkingDeleted}
                            onPress={async () => {
                                try {
                                    setIsMarkingDeleted(true);
                                    const newVal = !localItem.deletedOnInstagram;
                                    await instagramService.updateVideoStatus(localItem.id, { deletedOnInstagram: newVal });
                                    const updated = { ...localItem, deletedOnInstagram: newVal };
                                    setLocalItem(updated);
                                    onPostUpdated?.(updated);
                                    setIsMarkDeletedDialogVisible(false);
                                } catch (err: any) {
                                    Alert.alert('Error', err.message || 'Failed to update post.');
                                } finally {
                                    setIsMarkingDeleted(false);
                                }
                            }}
                        >
                            {localItem.deletedOnInstagram ? 'Restore' : 'Mark Deleted'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
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
        top: defaultHeight * 0.15,
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lensTopTrigger: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(2, 132, 199, 0.75)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.5)',
    },
    menuTrigger: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 22,
    },
    mediaFocusPill: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    mediaFocusPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    topLeftIconContainer: {
        position: 'absolute',
        left: 10,
        zIndex: 200,
    },
    competitorOverlayContainer: {
        position: 'absolute',
        left: 12,
        zIndex: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: 14,
        padding: 8,
        gap: 4,
    },
    competitorOverlayPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    competitorVelocityText: {
        color: '#FBBF24',
        fontWeight: '800',
        fontSize: 11,
    },
    competitorOutlierTag: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontWeight: '600',
        fontSize: 9,
    },
    youtubeFloatingBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuBackdrop: {
        ...StyleSheet.absoluteFill,
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
        minHeight: defaultHeight * 0.4,
    },
    youtubeSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: defaultHeight * 0.1,
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
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
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
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
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
    thumbnailVideoOverlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    openInInstaOverlayBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    playIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    openInInstaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    openInInstaBadgeText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    placeholderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        marginTop: 10,
        fontWeight: '500',
    },
    placeholderActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 16,
    },
    retryButton: {
        borderRadius: 20,
    },
    openInInstaFallbackButton: {
        borderRadius: 20,
    },
    competitorMetricsCard: {
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        marginBottom: 10,
        gap: 10,
    },
    metricsCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricsCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    metricsCardTitle: {
        fontWeight: '700',
        fontSize: 13,
    },
    multiplierBadgeDetail: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    metricTabsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    metricTabTile: {
        flex: 1,
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
        gap: 2,
    },
    metricTabHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricTabLabel: {
        fontSize: 10,
        fontWeight: '700',
    },
    activeDotIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    metricTabValue: {
        fontWeight: '800',
        fontSize: 13,
    },
    metricTabBaseline: {
        fontSize: 9,
        opacity: 0.6,
    },
    detailSparklineWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    projectionInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
    },
    projectionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    projectionLabel: {
        fontSize: 10,
        opacity: 0.65,
    },
    projectionValue: {
        fontSize: 10,
        fontWeight: '700',
    },
    dayIndicator: {
        fontSize: 10,
        opacity: 0.65,
        fontWeight: '600',
    },
    deletedOverlayBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(183,28,28,0.85)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
        zIndex: 120,
    },
    deletedOverlayText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 11,
        letterSpacing: 1.5,
    },
});
