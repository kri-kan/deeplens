import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Surface, Text, useTheme, Icon } from 'react-native-paper';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <Surface
      style={[
        styles.tabBarContainer,
        { backgroundColor: (theme.colors as any).surfaceContainerHighest }
      ]}
      elevation={2}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Grab icon directly from Router props
        const iconName = options.tabBarIcon 
          ? (options.tabBarIcon as any)({ focused: isFocused, color: '', size: 24 }) 
          : 'help-circle';

        const isFAB = route.name === 'new';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            {isFAB ? (
              // Elevated Primary FAB
              <View style={[styles.fabContainer, { backgroundColor: theme.colors.primary }]}>
                <Icon source={iconName} size={28} color={theme.colors.onPrimary} />
              </View>
            ) : (
              // Standard Tab Item
              <View style={styles.standardItem}>
                <Icon
                  source={iconName}
                  size={24}
                  color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelSmall"
                  style={{
                    color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontWeight: isFocused ? 'bold' : 'normal'
                  }}
                >
                  {label as string}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 20, // safe area approximation
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standardItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20, // Lift it slightly up
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  }
});
