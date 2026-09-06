import { YStack, XStack, Text } from 'tamagui';
import { LuX } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type SortOption = {
  id: string;
  label: string;
};

export type SortBottomSheetProps = {
  options: SortOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function SortBottomSheet({
  options,
  selectedId,
  onSelect,
  onClose,
}: SortBottomSheetProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0,0,0,0.45)"
      justifyContent="flex-end"
      zIndex={300}
      onPress={onClose}
    >
      <YStack
        backgroundColor={tokens.surface}
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        borderWidth={1}
        borderColor={tokens.border}
        paddingBottom={30}
        overflow="hidden"
        onPress={(e) => e.stopPropagation()}
        shadowColor="#000"
        shadowOpacity={0.25}
        shadowRadius={24}
      >
        {/* Drag Handle */}
        <XStack justifyContent="center" paddingTop={10} paddingBottom={4}>
          <YStack width={36} height={4} borderRadius={9999} backgroundColor={tokens.borderStrong} />
        </XStack>

        {/* Header */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={14}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          justifyContent="space-between"
          alignItems="center"
        >
          <Text
            fontSize={12}
            fontWeight="800"
            letterSpacing={1.2}
            textTransform="uppercase"
            color={tokens.textMuted}
          >
            SORT BY
          </Text>
          <XStack
            cursor="pointer"
            padding={4}
            onPress={onClose}
          >
            <LuX size={16} color={tokens.textMuted} />
          </XStack>
        </XStack>

        {/* Options List */}
        <YStack>
          {options.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <XStack
                key={opt.id}
                paddingHorizontal={20}
                paddingVertical={15}
                borderBottomWidth={1}
                borderBottomColor={tokens.border}
                alignItems="center"
                justifyContent="space-between"
                cursor="pointer"
                backgroundColor={isSelected ? tokens.accentSubtle : 'transparent'}
                onPress={() => {
                  onSelect(opt.id);
                  onClose();
                }}
                hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
              >
                <Text
                  fontSize={14}
                  fontWeight={isSelected ? '800' : '500'}
                  color={isSelected ? tokens.accent : tokens.text}
                >
                  {opt.label}
                </Text>

                {/* Radio indicator */}
                <XStack
                  width={20}
                  height={20}
                  borderRadius={9999}
                  borderWidth={2}
                  borderColor={isSelected ? tokens.accent : tokens.borderStrong}
                  alignItems="center"
                  justifyContent="center"
                >
                  {isSelected ? (
                    <YStack
                      width={10}
                      height={10}
                      borderRadius={9999}
                      backgroundColor={tokens.accent}
                    />
                  ) : null}
                </XStack>
              </XStack>
            );
          })}
        </YStack>
      </YStack>
    </YStack>
  );
}
