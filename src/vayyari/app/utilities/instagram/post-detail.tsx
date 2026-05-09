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
    const [posts, setPosts] = useState<any[]>(() => {
        const cached = instagramService.getLastFetchedPosts();
        if (cached && cached.length > 0) {
            return cached.map(normalizeData);
        }
        return initialItem ? [initialItem] : [];
    });
    
    const [activeIndex, setActiveIndex] = useState(() => {
        if (posts.length > 0) {
            const targetId = (id || initialItem?.id)?.toString();
            const idx = posts.findIndex((p: InstagramPost) => p.id?.toString() === targetId);
            return idx !== -1 ? idx : 0;
        }
        return 0;
    });

    const { isMuted, setIsMuted, volume, setVolume } = useVideoSettings();
    const [isPlaying, setIsPlaying] = useState(true);
    const [loading, setLoading] = useState(posts.length <= 1);
    const [isDragging, setIsDragging] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!loading && posts.length > 1) {
            const targetId = (id || initialItem?.id)?.toString();
            const idx = posts.findIndex((p: InstagramPost) => p.id?.toString() === targetId);
            
            if (idx !== -1) {
                setActiveIndex(idx);
                // Use a small timeout to ensure FlatList has rendered the new list
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ 
                        index: idx, 
                        animated: false 
                    });
                }, 100);
            }
        }
    }, [loading, posts.length]);

    useEffect(() => {
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
                const allPosts = (response.videos || []).map(normalizeData);
                setPosts(allPosts);
                
                const targetId = (id || initialItem?.id)?.toString();
                const idx = allPosts.findIndex((p: InstagramPost) => p.id?.toString() === targetId);
                if (idx !== -1) setActiveIndex(idx);
            } catch (e) {
                console.error("Error loading profile posts", e);
            } finally {
                setLoading(false);
            }
        };
        loadAllPosts();
    }, [username, id, sortBy, sortOrder]);

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
                        keyExtractor={(p) => p.id}
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
