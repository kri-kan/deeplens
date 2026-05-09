import { View, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { BentoCard } from '@/components/ui/BentoCard';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface GridMenuItem {
  id: string;
  title: string;
  icon: any; // Changed from string to any to support required assets
  route?: string;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
}

interface GridMenuProps {
  items: GridMenuItem[];
  columns?: number;
  gap?: number;
}

export const GridMenu: React.FC<GridMenuProps> = ({
  items,
  columns = 4,
  gap = 0,
}) => {
  const theme = useTheme();
  const router = useRouter();
  
  const tileSize = (width - 32) / columns; // Assuming 16px horizontal padding on container

  return (
    <View style={[styles.grid, { gap }]}>
      {items.map((item) => {
        const isDisabled = item.disabled || (!item.route && !item.onPress);
        const isImageAsset = typeof item.icon === 'number' || (typeof item.icon === 'object' && item.icon?.uri);
        
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => {
              if (item.onPress) item.onPress();
              else if (item.route) router.push(item.route as any);
            }}
            disabled={isDisabled}
            style={{ width: tileSize, height: tileSize }}
          >
            <BentoCard
              style={[styles.tile, { height: tileSize, borderRadius: 0 }]}
              surfaceLevel="surfaceContainerLow"
            >
              <View style={styles.tileContent}>
                {isImageAsset ? (
                  <Image 
                    source={item.icon} 
                    style={[styles.imageIcon, { opacity: isDisabled ? 0.3 : 1 }]} 
                    resizeMode="contain"
                  />
                ) : (
                  <Icon
                    source={item.icon}
                    size={42}
                    color={isDisabled ? '#ccc' : item.color || theme.colors.primary}
                  />
                )}
                <Text
                  variant="labelSmall"
                  style={[styles.tileTitle, { color: isDisabled ? '#999' : theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>
            </BentoCard>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    width: 42,
    height: 42,
  },
  tileTitle: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
    paddingTop: 8,
  },
});
