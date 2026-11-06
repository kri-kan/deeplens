import React from 'react';
import { Modal } from 'react-native';
import { YStack } from 'tamagui';
import { StoreColorGroup, StoreCurationMediaItem } from './types';
import { ProductDetailFragment } from '@/components/tamagui-ui/organisms/StoreCuration/ProductDetailFragment';

export interface StorePdpLivePreviewModalProps {
  productCode: string;
  title: string;
  fabric: string;
  mrp: number;
  salePrice: number;
  colorGroups: StoreColorGroup[];
  mediaList: StoreCurationMediaItem[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export function StorePdpLivePreviewModal({
  productCode,
  title,
  fabric,
  mrp,
  salePrice,
  colorGroups,
  mediaList,
  selectedGroupId,
  onSelectGroup,
  onClose,
  isStandalone = true,
}: StorePdpLivePreviewModalProps) {
  const content = (
    <ProductDetailFragment
      mode="preview"
      product={{
        code: productCode,
        title,
        fabric,
        price: salePrice,
        originalPrice: mrp,
        colorGroups: colorGroups as any,
        mediaList: mediaList as any,
      }}
      selectedColorId={selectedGroupId}
      onSelectColorId={onSelectGroup}
      onBack={onClose}
      borderless={true}
    />
  );

  if (!isStandalone) {
    return content;
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <YStack flex={1} backgroundColor="#FFFFFF">
        {content}
      </YStack>
    </Modal>
  );
}
