import React from 'react';
import { View, StyleSheet } from 'react-native';

export interface VideoPlayerProps {
  url: string;
  posterUrl?: string;
  autoPlay?: boolean;
  isMuted?: boolean;
  style?: any;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  posterUrl,
  autoPlay = true,
  isMuted = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Native HTML5 video on web platform */}
      <video
        src={url}
        poster={posterUrl}
        controls
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000000',
        }}
      />
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
  },
});
