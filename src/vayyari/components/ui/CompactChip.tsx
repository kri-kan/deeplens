import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CompactChipProps {
  children: string;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  color?: string;
  outline?: boolean;
}

export const CompactChip: React.FC<CompactChipProps> = ({
  children,
  icon,
  style,
  textStyle,
  color,
  outline = false,
}) => {
  const theme = useTheme();
  const baseColor = color || theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: outline ? 'transparent' : `${baseColor}15`,
          borderColor: outline ? baseColor : 'transparent',
          borderWidth: outline ? 1 : 0,
        },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={12}
          color={baseColor}
          style={styles.icon}
        />
      )}
      <Text
        variant="labelSmall"
        style={[
          styles.text,
          { color: baseColor },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
});
