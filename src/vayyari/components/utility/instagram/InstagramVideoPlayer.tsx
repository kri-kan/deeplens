import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton, Text, Icon } from 'react-native-paper';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { InstagramPost } from '@/services/instagram.service';
import { getMediaUri, normalizeData, openInstagramPost } from '@/utils/instagram-helpers';

interface CustomVideoPlayerProps {
    media: InstagramPost;
    width: number;
    getMediaHeight: () => number;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    volume: number;
    setVolume: (volume: number) => void;
    isPlaying: boolean;
    isActive: boolean;
}

export const InstagramVideoPlayer = React.memo(({ 
    media,
    width, 
    getMediaHeight, 
    isMuted, 
    setIsMuted, 
    volume, 
    setVolume, 
    isPlaying, 
    isActive
}: CustomVideoPlayerProps) => {
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const uri = getMediaUri(media);
    const currentUriRef = useRef<string | null>(uri);

    const isImageFallback = !uri || uri.toLowerCase().endsWith('.jpg') || uri.toLowerCase().endsWith('.jpeg');
    const [hasError, setHasError] = useState(isImageFallback);

    const player = useVideoPlayer(hasError ? '' : uri, (p) => {
        p.loop = true;
        p.muted = isMuted;
        p.volume = volume;
        if (isPlaying && isActive && !hasError) {
            try {
                p.play();
            } catch (err) {
                console.log('[VideoPlayer] Initial play suppressed error:', err);
            }
        }
    });

    const [isReady, setIsReady] = useState(player?.status === 'readyToPlay');

    const handleOpenInInstagram = useCallback(() => {
        openInstagramPost(media);
    }, [media]);

    useEffect(() => {
        if (isImageFallback || !uri) {
            setHasError(true);
            setIsReady(false);
        }
    }, [uri, isImageFallback]);

    useEffect(() => {
        if (!player) return;
        if (player.status === 'readyToPlay') {
            setIsReady(true);
            setHasError(false);
        } else if (player.status === 'error') {
            setHasError(true);
            setIsReady(false);
        }
    }, [player, uri]);

    useEffect(() => {
        if (!player || hasError || isImageFallback) return;
        try {
            if (isPlaying && isActive) {
                player.play();
            } else {
                player.pause();
            }
        } catch (err) {
            console.log('[VideoPlayer] Playback toggle error:', err);
        }
    }, [isPlaying, player, isActive, hasError, isImageFallback]);

    useEffect(() => {
        if (!player) return;

        if (player.status === 'readyToPlay') {
            setIsReady(true);
            setHasError(false);
        } else if (player.status === 'error') {
            setHasError(true);
            setIsReady(false);
        }

        const stateSub = player.addListener('playingChange', (event) => {
            if (isActive) console.log(`[Video] Playing: ${event.isPlaying} | URI: ${uri}`);
        });

        const statusSub = player.addListener('statusChange', (event) => {
            if (isActive) console.log(`[Video] Status: ${event.status} | URI: ${uri}`);
            if (event.status === 'readyToPlay') {
                setIsReady(true);
                setHasError(false);
            }
            if (event.status === 'error' || event.error) {
                setHasError(true);
                setIsReady(false);
                console.log(`[Video] Handled playback error: ${event.error?.message || 'Playback failed'} | URI: ${uri}`);
            }
        });

        return () => {
            stateSub.remove();
            statusSub.remove();
        };
    }, [player, isActive, uri]);

    useEffect(() => {
        if (!player) return;
        try {
            player.muted = isMuted;
            player.volume = volume;
        } catch (err) {
            console.log('[VideoPlayer] Volume update error:', err);
        }
    }, [isMuted, volume, player]);

    useEffect(() => {
        if (isActive && uri) {
            const normalized = normalizeData(media);
            console.log('[Video] Data:', { 
                id: normalized?.id, 
                mediaType: normalized?.mediaType, 
                hasPath: !!normalized?.storagePath,
                path: normalized?.storagePath 
            });
        }
    }, [isActive, uri, media]);

    const resetSliderTimer = useCallback(() => {
        if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
        sliderTimerRef.current = setTimeout(() => {
            setShowVolumeSlider(false);
        }, 3000);
    }, []);

    useEffect(() => {
        if (showVolumeSlider) resetSliderTimer();
        return () => {
            if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
        };
    }, [showVolumeSlider, resetSliderTimer]);

    useEffect(() => {
        if (isActive && player && uri && !isImageFallback) {
            try {
                if (currentUriRef.current !== uri) {
                    player.replaceAsync(uri).then(() => {
                        setIsReady(player.status === 'readyToPlay');
                    }).catch((err) => {
                        console.log('[VideoPlayer] replaceAsync error handled:', err);
                        setHasError(true);
                    });
                    currentUriRef.current = uri;
                }
                if (isPlaying && !hasError) {
                    try {
                        player.play();
                    } catch (playErr) {
                        console.log('[VideoPlayer] play error handled:', playErr);
                    }
                }
            } catch (err) {
                console.log('[VideoPlayer] Source update error handled:', err);
                setHasError(true);
            }
        }
    }, [isActive, uri, player, isPlaying, isImageFallback, hasError]);

    const coverUri = getMediaUri(media, 'large') || media?.thumbnailUrl || media?.mediaUrl;

    return (
        <View style={{ width, height: getMediaHeight() }}>
            {!hasError && (
                <VideoView
                    player={player}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                />
            )}
            
            {(!isReady || hasError) && (
                <View style={StyleSheet.absoluteFill}>
                    <Image 
                        source={{ uri: coverUri }} 
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                    
                    {hasError && (
                        <TouchableOpacity 
                            style={styles.fallbackOverlay}
                            activeOpacity={0.85}
                            onPress={handleOpenInInstagram}
                        >
                            <View style={styles.fallbackContentBadge}>
                                <Icon source="instagram" size={20} color="#FFFFFF" />
                                <Text style={styles.fallbackText}>
                                    Video unavailable locally · Tap to open in Instagram
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            
            {!hasError && isReady && (
                <View style={styles.rightVolumeOverlay}>
                    <IconButton
                        icon={isMuted || volume === 0 ? "volume-off" : "volume-high"}
                        iconColor="white"
                        size={28}
                        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                        onPress={() => setIsMuted(!isMuted)}
                        onLongPress={() => setShowVolumeSlider(!showVolumeSlider)}
                    />
                    
                    {showVolumeSlider && (
                        <View style={styles.rightVolumeSliderContainer}>
                            <View style={styles.volumeSliderTrack}>
                                <View style={[styles.volumeSliderFill, { height: `${volume * 100}%` }]} />
                            </View>
                            <TouchableOpacity 
                                style={StyleSheet.absoluteFill}
                                onPressIn={(e) => {
                                    const y = e.nativeEvent.locationY;
                                    const newVol = Math.max(0, Math.min(1, 1 - (y / 100)));
                                    setVolume(newVol);
                                    if (newVol > 0) setIsMuted(false);
                                    resetSliderTimer();
                                }}
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    fallbackOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        paddingHorizontal: 20,
    },
    fallbackContentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 10,
        maxWidth: '90%',
    },
    fallbackText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
        textAlign: 'center',
        flexShrink: 1,
    },
    rightVolumeOverlay: {
        position: 'absolute',
        bottom: 80,
        right: 16,
        zIndex: 10,
        alignItems: 'center',
    },
    rightVolumeSliderContainer: {
        position: 'absolute',
        bottom: 50,
        width: 40,
        height: 100,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
    },
    volumeSliderTrack: {
        width: 4,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        justifyContent: 'flex-end',
    },
    volumeSliderFill: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 2,
    },
});

InstagramVideoPlayer.displayName = 'InstagramVideoPlayer';
