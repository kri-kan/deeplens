import React from 'react';
import { ScrollView } from 'react-native';
import { SegmentedControl } from '../../atoms/SegmentedControl/SegmentedControl';

export type WishlistFilterType = 'All' | 'Sarees' | 'Lehengas' | 'Jewellery' | 'In Stock Only';

export type WishlistFilterPillsProps = {
  selectedFilter: WishlistFilterType;
  counts?: Record<WishlistFilterType, number>;
  onSelectFilter: (filter: WishlistFilterType) => void;
};

export function WishlistFilterPills({
  selectedFilter = 'All',
  counts,
  onSelectFilter,
}: WishlistFilterPillsProps) {
  const filters: WishlistFilterType[] = ['All', 'Sarees', 'Lehengas', 'Jewellery', 'In Stock Only'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      <SegmentedControl
        activeId={selectedFilter}
        onChange={(id) => onSelectFilter(id as WishlistFilterType)}
        options={filters.map((f) => ({
          id: f,
          label: f,
          badge: counts?.[f] !== undefined ? String(counts[f]) : undefined,
        }))}
      />
    </ScrollView>
  );
}
