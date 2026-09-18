import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Play, ExternalLink } from 'lucide-react-native';

export interface VideoPlayerProps {
  url: string;
  posterUrl?: string;
  autoPlay?: boolean;
  isMuted?: boolean;
  style?: any;
}

// Safely probe for native expo-video module
let NativeVideoView: any = null;
let useNativeVideoPlayer: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoVideo = require('expo-video');
  if (ExpoVideo && ExpoVideo.VideoView && ExpoVideo.useVideoPlayer) {
    NativeVideoView = ExpoVideo.VideoView;
    useNativeVideoPlayer = ExpoVideo.useVideoPlayer;
  }
} catch {
  // expo-video not available in this native build; use fallback
  NativeVideoView = null;
  useNativeVideoPlayer = null;
}

const NativeExpoVideoComponent: React.FC<VideoPlayerProps> = ({
  url,
  autoPlay = true,
  isMuted = false,
  style,
}) => {
  const player = useNativeVideoPlayer(url, (p: any) => {
    p.loop = true;
    p.muted = isMuted;
    if (autoPlay) {
      try {
        p.play();
      } catch (err) {
        console.warn('[StoreVideoPlayer] Autoplay prevented:', err);
      }
    }
  });

  return (
    <View style={[styles.container, style]}>
      <NativeVideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
    </View>
  );
};

export const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  const { url, posterUrl, style } = props;
  const [loading, setLoading] = useState(false);

  if (NativeVideoView && useNativeVideoPlayer) {
    return <NativeExpoVideoComponent {...props} />;
  }

  const handleOpenExternal = async () => {
    try {
      setLoading(true);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.warn('[VideoPlayer] Cannot open video URL:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.blackBackground} />
      )}

      {/* Video Overlay Control */}
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.playButton}
          activeOpacity={0.8}
          onPress={handleOpenExternal}
        >
          {loading ? (
            <ActivityIndicator color="#FAF7F2" size="small" />
          ) : (
            <Play size={28} color="#FAF7F2" fill="#FAF7F2" />
          )}
        </TouchableOpacity>
        <Text style={styles.videoLabel}>Product Video</Text>
        <TouchableOpacity
          style={styles.openExternalBtn}
          onPress={handleOpenExternal}
        >
          <ExternalLink size={14} color="#D4AF37" />
          <Text style={styles.openExternalText}>Play in full video player</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  blackBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(26, 54, 93, 0.85)',
    borderWidth: 2,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoLabel: {
    color: '#FAF7F2',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  openExternalText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
  },
});
