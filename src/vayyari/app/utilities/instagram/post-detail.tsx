import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, FlatList } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { instagramService, InstagramPost } from '@/services/instagram.service';
import { InstagramPostDetailItem } from '@/components/utility/instagram/InstagramPostDetailItem';
import { useVideoSettings } from '@/hooks/useVideoSettings';
import { normalizeData } from '@/utils/instagram-helpers';

const { height } = Dimensions.get('window');

export default function PostDetailScreen() {
    const { id, username, sortBy, sortOrder, data: initialData } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const initialItem = initialData ? normalizeData(JSON.parse(initialData as string)) : null;
    const targetId = (id as string) || initialItem?.id?.toString();

    const extractShortcode = (urlOrStr?: string) => {
        if (!urlOrStr) return undefined;
        const match = urlOrStr.match(/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
        if (match) return match[1];
        if (/^[A-Za-z0-9_-]{5,25}$/.test(urlOrStr) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(urlOrStr)) return urlOrStr;
        return undefined;
    };
    const targetShortcode = extractShortcode(initialItem?.permalink) ||
                            extractShortcode(initialItem?.postUrl) ||
                            extractShortcode(id as string);

    const matchesTarget = (p: InstagramPost) => {
        if (!p) return false;
        const pId = p.id?.toString();
        if (targetId && pId === targetId) return true;
        if (targetId && p.platformVideoId && p.platformVideoId.toString() === targetId) return true;
        if (targetShortcode) {
            if (p.permalink && p.permalink.includes(targetShortcode)) return true;
            if (p.postUrl && p.postUrl.includes(targetShortcode)) return true;
            if (p.platformVideoId && p.platformVideoId.toString() === targetShortcode) return true;
        }
        return false;
    };

    const [posts, setPosts] = useState<any[]>(() => {
        const cached = instagramService.getLastFetchedPosts();
        // Normalize the cache first so ID fields (postId vs id) are resolved consistently,
        // then only use it if it actually contains the target post.
        if (cached && cached.length > 0) {
            const normalizedCache = cached.map(normalizeData);
            const hit = normalizedCache.some(matchesTarget);
            if (hit) return normalizedCache;
        }
        return initialItem ? [initialItem] : [];
    });
    
    const [activeIndex, setActiveIndex] = useState(() => {
        if (posts.length > 0) {
            const idx = posts.findIndex(matchesTarget);
            return idx !== -1 ? idx : 0;
        }
        return 0;
    });

    const { isMuted, setIsMuted, volume, setVolume } = useVideoSettings();
    const [isPlaying, setIsPlaying] = useState(true);
    const [loading, setLoading] = useState(posts.length <= 1);
    const [isDragging, setIsDragging] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Initial mount positioning fallback for FlatList when landing on non-zero index
    useEffect(() => {
        if (activeIndex > 0) {
            const timer = setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: activeIndex * height, animated: false });
            }, 60);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        // If we already have the target post in a populated list (e.g. from the explorer cache),
        // DO NOT re-fetch the first page of 100 items. Doing so would truncate any posts beyond
        // offset 100 (causing posts like row 126 to be dropped and flipping to the 100th post)
        // and clobber the user's navigated list.
        if (posts.length > 1 && posts.some(matchesTarget)) {
            setLoading(false);
            return;
        }

        const loadAllPosts = async () => {
            if (!username) {
                setLoading(false);
                return;
            }

            try {
                const response = await instagramService.getProfileDetails(
                    username as string, 
                    (sortBy as string) || 'date', 
                    (sortOrder as string) || 'desc'
                );
                if (response?.videos && response.videos.length > 0) {
                    const fetched = response.videos.map(normalizeData);
                    const idx = fetched.findIndex(matchesTarget);

                    let finalPosts: InstagramPost[];
                    let finalIndex: number;

                    if (idx !== -1) {
                        finalPosts = fetched;
                        finalIndex = idx;
                    } else if (initialItem) {
                        // The target post was not in the first 100 items (e.g. older post).
                        // Preserve initialItem so the clicked post is NEVER lost or flipped to a default post.
                        finalPosts = [initialItem, ...fetched.filter(p => !matchesTarget(p))];
                        finalIndex = 0;
                    } else {
                        finalPosts = fetched;
                        finalIndex = 0;
                    }

                    setPosts(finalPosts);
                    setActiveIndex(finalIndex);

                    // scrollToOffset is reliable regardless of rendered window size;
                    // scrollToIndex silently fails when the target isn't rendered yet.
                    setTimeout(() => {
                        flatListRef.current?.scrollToOffset({ offset: finalIndex * height, animated: false });
                    }, 150);
                }
            } catch (e) {
                console.error("Error loading profile posts", e);
            } finally {
                setLoading(false);
            }
        };
        loadAllPosts();
    }, [username, sortBy, sortOrder]);

    const theme = useTheme();

    return (
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style="dark" />
                
                {!loading || initialItem ? (
                    <FlatList
                        ref={flatListRef}
                        data={posts}
                        pagingEnabled
                        scrollEnabled={!isDragging}
                        initialScrollIndex={activeIndex}
                        getItemLayout={(data, index) => ({
                            length: height,
                            offset: height * index,
                            index,
                        })}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.y / height);
                            setActiveIndex(index);
                        }}
                        onScrollToIndexFailed={({ index }) => {
                            // Fallback: scroll by offset if item isn't rendered yet
                            flatListRef.current?.scrollToOffset({ offset: index * height, animated: false });
                        }}
                        renderItem={({ item, index }) => (
                            <InstagramPostDetailItem 
                                item={item}
                                isMuted={isMuted}
                                setIsMuted={setIsMuted}
                                volume={volume}
                                setVolume={setVolume}
                                isPlaying={isPlaying}
                                setIsPlaying={setIsPlaying}
                                isActive={index === activeIndex}
                                insets={insets}
                                onDraggingStateChange={setIsDragging}
                                onPostUpdated={(updatedPost) => {
                                    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
                                }}
                            />
                        )}
                        keyExtractor={(p, index) => (p?.id ? p.id.toString() : `post-${index}`)}
                        showsVerticalScrollIndicator={false}
                        windowSize={3}
                        maxToRenderPerBatch={3}
                        removeClippedSubviews={true}
                    />
                ) : (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator color="white" />
                    </View>
                )}

                <IconButton 
                    icon="arrow-left" 
                    iconColor="black" 
                    size={28} 
                    style={[styles.backButton, { top: insets.top + 4 }]}
                    onPress={() => router.back()}
                />
            </View>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 4,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
});
