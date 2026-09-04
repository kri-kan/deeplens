import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuX } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type CartItem = {
  id: string;
  name: string;
  color: string;
  size: string;
  price: string;
  gradient: [string, string];
};

export type CartDrawerProps = {
  items: CartItem[];
  onClose?: () => void;
  onCheckout?: () => void;
};

export function CartDrawer({ items, onClose, onCheckout }: CartDrawerProps) {
  const { tokens } = useTheme();
  const total = items.reduce(
    (sum, i) => sum + parseInt(i.price.replace(/[^0-9]/g, '') || '0', 10),
    0
  );

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderTopLeftRadius={24}
      borderTopRightRadius={24}
      padding={24}
      minHeight={240}
      shadowColor="#000000"
      shadowOpacity={0.15}
      shadowRadius={24}
    >
      <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
        <Text fontSize={20} fontWeight="800" color={tokens.text}>
          Your Bag ({items.length})
        </Text>
        <XStack
          cursor="pointer"
          onPress={onClose}
          padding={6}
          borderRadius={8}
          hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
        >
          <LuX size={20} color={tokens.textMuted} />
        </XStack>
      </XStack>

      {items.length === 0 ? (
        <YStack paddingVertical={40} alignItems="center" justifyContent="center">
          <Text fontSize={16} color={tokens.textMuted} fontWeight="500">
            Your shopping bag is empty
          </Text>
        </YStack>
      ) : (
        <YStack gap={16} marginBottom={20}>
          {items.map((item) => (
            <XStack
              key={item.id}
              gap={14}
              alignItems="center"
              padding={10}
              borderRadius={12}
              hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
            >
              <LinearGradient
                colors={item.gradient}
                style={{
                  width: 72,
                  height: 90,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: tokens.border,
                }}
              />
              <YStack flex={1} gap={4}>
                <Text fontSize={15} fontWeight="700" color={tokens.text}>
                  {item.name}
                </Text>
                <Text fontSize={12} color={tokens.textSecondary}>
                  Colour: {item.color} • Size: {item.size}
                </Text>
                <Text fontSize={16} fontWeight="800" color={tokens.text}>
                  {item.price}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>
      )}

      {items.length > 0 && (
        <XStack
          height={50}
          backgroundColor={tokens.accent}
          borderRadius={14}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={onCheckout}
          hoverStyle={{ opacity: 0.92, scale: 1.01 }}
          pressStyle={{ scale: 0.97 }}
        >
          <Text
            color={tokens.accentForeground}
            fontWeight="800"
            fontSize={16}
            letterSpacing={0.2}
          >
            Checkout — ₹{total.toLocaleString('en-IN')}
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
