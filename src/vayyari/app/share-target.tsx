import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useShareIntentContext, SharedMediaItem } from '@/context/ShareIntentContext';

export default function ShareTargetScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    action?: string;
    sessionId?: string;
    uris?: string;
    media?: string;
  }>();
  const { setSharedMedia } = useShareIntentContext();

  useEffect(() => {
    const action = params.action || 'chooser';
    const sessionId = params.sessionId;
    const urisParam = params.uris || params.media;

    if (urisParam && typeof urisParam === 'string') {
      const uris = urisParam.split(',').filter(Boolean);
      const items: SharedMediaItem[] = uris.map(uri => {
        const lower = uri.toLowerCase();
        const isVideo =
          lower.endsWith('.mp4') ||
          lower.endsWith('.mov') ||
          lower.endsWith('.mkv') ||
          lower.endsWith('.webm');
        return {
          uri,
          type: isVideo ? 'video' : 'image',
          sessionId,
        };
      });

      // Stage media in context
      setSharedMedia(items, sessionId);

      // Route based on action
      if (action === 'order') {
        router.replace('/(tabs)/new');
      } else if (action === 'product') {
        router.replace('/utilities/create-product');
      } else {
        // Fallback to tabs where chooser modal will be handled or show
        router.replace('/(tabs)');
      }
    } else {
      // If no URIs received, route back to main tabs
      router.replace('/(tabs)');
    }
  }, [params, router, setSharedMedia]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="bodyMedium" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
        Processing shared media...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontWeight: '500',
  },
});
