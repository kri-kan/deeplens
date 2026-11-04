import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  MediaDeltaDiffSelector,
  DiffPhoto,
} from '../../components/molecules/MediaDeltaDiffSelector/MediaDeltaDiffSelector';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const SAMPLE_PHOTOS: DiffPhoto[] = [
  {
    id: 'photo-new-1',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200',
    filename: 'pallu_zari_closeup.jpg',
    status: 'added',
  },
  {
    id: 'photo-new-2',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200',
    filename: 'blouse_piece_texture.jpg',
    status: 'added',
  },
  {
    id: 'photo-old-3',
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=200',
    filename: 'unmerged_duplicate.jpg',
    status: 'removed',
  },
];

const meta: Meta<any> = {
  title: 'Molecules/MediaDeltaDiffSelector',
  component: MediaDeltaDiffSelector,
  args: {
    ...THEME_ARGS,
    productCode: 'VF2D2B',
    photos: SAMPLE_PHOTOS,
    onConfirmSync: (ids: string[]) => console.log('Confirmed:', ids),
    onClose: () => console.log('Closed'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof MediaDeltaDiffSelector>;

export const DefaultDiffModal: Story = {
  name: '1. Standard Media Diff (2 Added, 1 Pruned)',
  args: {
    productCode: 'VF2D2B',
    photos: SAMPLE_PHOTOS,
  },
};

export const OnlyAddedPhotos: Story = {
  name: '2. Only Added Photos',
  args: {
    productCode: 'VF1FC22',
    photos: SAMPLE_PHOTOS.filter((p) => p.status === 'added'),
  },
};
