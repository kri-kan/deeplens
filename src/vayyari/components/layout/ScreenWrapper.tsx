import React from 'react';
import { StyleSheet, ScrollView, View, ViewStyle, RefreshControl } from 'react-native';
import { Surface, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

interface ScreenWrapperProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  withScrollView?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerElevation?: number;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  title,
  onBack,
  actions,
  children,
  contentContainerStyle,
  withScrollView = true,
  refreshing = false,
  onRefresh,
  headerElevation = 0,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const renderContent = () => {
    if (withScrollView) {
      return (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      );
    }
    return <View style={[styles.content, { flex: 1 }, contentContainerStyle]}>{children}</View>;
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header 
        style={{ backgroundColor: theme.colors.background }} 
        elevated={headerElevation > 0}
      >
        {onBack ? (
          <Appbar.BackAction onPress={onBack} />
        ) : (
          router.canGoBack() && <Appbar.BackAction onPress={() => router.back()} />
        )}
        <Appbar.Content title={title} titleStyle={styles.headerTitle} />
        {actions}
      </Appbar.Header>
      {renderContent()}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    paddingBottom: 24,
  },
});
