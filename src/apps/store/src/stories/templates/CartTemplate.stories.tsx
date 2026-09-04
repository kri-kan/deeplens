import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, Text } from 'tamagui';
import { CartTemplate } from '../../components/templates/CartTemplate';
import { CartHeader } from '../../components/organisms/CartHeader/CartHeader';
import { DeliveryPincodeChecker } from '../../components/molecules/DeliveryPincodeChecker/DeliveryPincodeChecker';
import { MyntraStyleCartItem } from '../../components/molecules/CartItem/MyntraStyleCartItem';
import { CouponSection } from '../../components/molecules/CouponSection/CouponSection';
import { ArtisanSupportDonation } from '../../components/molecules/ArtisanSupportDonation/ArtisanSupportDonation';
import { PriceDetailsCard } from '../../components/molecules/PriceDetailsCard/PriceDetailsCard';
import { CrossSellRecommendationsRail } from '../../components/organisms/CrossSellRecommendationsRail/CrossSellRecommendationsRail';
import { INITIAL_CART_ITEMS } from '../../components/pages/CartPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Templates/CartTemplate',
  component: CartTemplate,
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;
type Story = StoryObj<typeof CartTemplate>;

const sampleItems = INITIAL_CART_ITEMS;

const renderTemplate = (args: any) => (
  <CartTemplate
    header={<CartHeader currentStep="bag" />}
    pincodeChecker={<DeliveryPincodeChecker initialPincode="560001" />}
    selectionHeader={
      <YStack padding={12} backgroundColor="#fff" borderRadius={8}>
        <Text fontSize={13} fontWeight="800">2/2 ITEMS SELECTED</Text>
      </YStack>
    }
    itemList={
      <YStack gap={12}>
        {sampleItems.map((item) => (
          <MyntraStyleCartItem key={item.id} item={item} />
        ))}
      </YStack>
    }
    crossSellRail={<CrossSellRecommendationsRail />}
    couponSection={<CouponSection cartTotal={2697} />}
    artisanDonation={<ArtisanSupportDonation />}
    priceDetails={<PriceDetailsCard totalMRP={14499} totalDiscount={11825} itemCount={2} />}
  />
);

export const InteractiveFormFactors: Story = {
  render: (args) => (
    <FormFactorPreview title="Cart Template" initialFactor="desktop">
      {renderTemplate(args)}
    </FormFactorPreview>
  ),
};

export const DesktopView: Story = {
  render: renderTemplate,
  decorators: [withFormFactor('desktop', 'Cart Template Desktop')],
};

export const MobileView: Story = {
  render: renderTemplate,
  decorators: [withFormFactor('mobile', 'Cart Template Mobile')],
};
