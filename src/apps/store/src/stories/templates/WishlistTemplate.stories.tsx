import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { WishlistTemplate } from '../../components/templates/WishlistTemplate';
import { Header } from '../../components/organisms/Header/Header';
import { TopNav } from '../../components/organisms/TopNav/TopNav';
import { WishlistCard } from '../../components/molecules/WishlistCard/WishlistCard';
import { WishlistFilterPills } from '../../components/molecules/WishlistFilterPills/WishlistFilterPills';
import { INITIAL_WISHLIST_ITEMS } from '../../components/pages/WishlistPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Templates/WishlistTemplate',
  component: WishlistTemplate,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof WishlistTemplate>;

const sampleItems = INITIAL_WISHLIST_ITEMS;

const renderTemplate = (args: any) => (
  <WishlistTemplate
    header={<Header />}
    topNav={<TopNav items={['Women', 'Men', 'Kids', 'Home & Living', 'Beauty']} />}
    titleBanner={
      <YStack gap={4}>
        <Text fontSize={22} fontWeight="900">My Cherished Pieces (6 items)</Text>
        <Text fontSize={13} color="#888">Handcrafted heirloom sarees and artisan accessories saved for your special moments.</Text>
      </YStack>
    }
    filterPills={<WishlistFilterPills selectedFilter="All" onSelectFilter={() => {}} />}
    grid={
      <View
        style={
          {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 20,
            width: '100%',
          } as any
        }
      >
        {sampleItems.slice(0, 4).map((item) => (
          <WishlistCard key={item.id} item={item} />
        ))}
      </View>
    }
  />
);

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="Wishlist Template" initialFactor="desktop">
      {renderTemplate(args)}
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  render: renderTemplate,
  decorators: [withFormFactor('desktop', 'Wishlist Template Desktop')],
};

export const MobileView: Story = {
  render: renderTemplate,
  decorators: [withFormFactor('mobile', 'Wishlist Template Mobile')],
};
