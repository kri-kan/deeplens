import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CollabPlannerScreen } from '@/components/tamagui-ui/pages/CollabPlannerScreen';

export default function CollabPlannerRoute() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/utilities/instagram-explorer' as any);
    }
  };

  const handleMarkCurated = (postId: string, selectedAccountIds: string[]) => {
    Alert.alert(
      'Collab Curated',
      `Post ${postId} marked as curated with ${selectedAccountIds.length} target accounts.`
    );
  };

  const handleQueueAutomation = (postId: string, selectedAccountIds: string[]) => {
    Alert.alert(
      'Queued for Automation',
      `Post ${postId} dispatched to AVD Maestro automation queue with ${selectedAccountIds.length} accounts.`
    );
  };

  return (
    <View style={styles.container}>
      <CollabPlannerScreen
        onBack={handleBack}
        onMarkCurated={handleMarkCurated}
        onQueueAutomation={handleQueueAutomation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
