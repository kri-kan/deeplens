import React from 'react';
import { StyleSheet, ScrollView, View, ViewStyle, RefreshControl, Platform, useWindowDimensions } from 'react-native';
import { Surface, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

interface ScreenWrapperProps {
  title: React.ReactNode;
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
  // On web, flex:1 alone doesn't constrain height without explicit CSS on ancestor elements.
  // We read the window height and pin the Surface to it so the inner FlatList gets a bounded
  // viewport and can scroll normally in the browser.
  const { height: windowHeight } = useWindowDimensions();
  const webHeightStyle = Platform.OS === 'web' ? { height: windowHeight } : {};

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
    return <View style={[{ flex: 1 }, withScrollView ? styles.content : undefined, contentContainerStyle]}>{children}</View>;
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }, webHeightStyle]} elevation={0}>
      <Appbar.Header 
        style={{ 
          backgroundColor: theme.colors.background, 
          height: React.isValidElement(title) ? 72 : 56 
        }} 
        elevated={headerElevation > 0}
      >
        {onBack ? (
          <Appbar.BackAction onPress={onBack} style={{ alignSelf: 'center' }} />
        ) : (
          router.canGoBack() && <Appbar.BackAction onPress={() => router.back()} style={{ alignSelf: 'center' }} />
        )}
        {React.isValidElement(title) ? (
          <View style={{ flex: 1, marginRight: 8, justifyContent: 'center', height: '100%' }}>{title}</View>
        ) : (
          <Appbar.Content title={title as any} titleStyle={styles.headerTitle} />
        )}
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
