import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { XStack } from 'tamagui';
import { CategoryPill } from '../../molecules/CategoryPill/CategoryPill';

export type CategoryRowProps = {
  items: string[];
  initialActive?: string;
  onSelect?: (label: string) => void;
};

export function CategoryRow({
  items,
  initialActive,
  onSelect,
}: CategoryRowProps) {
  const [active, setActive] = useState(initialActive ?? items[0]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
    >
      <XStack gap={10} alignItems="center">
        {items.map((label) => (
          <CategoryPill
            key={label}
            label={label}
            active={active === label}
            onPress={() => {
              setActive(label);
              onSelect?.(label);
            }}
          />
        ))}
      </XStack>
    </ScrollView>
  );
}
