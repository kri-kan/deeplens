import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  AdminOrderFormPage,
  MockImage,
  AddressData,
} from '../../components/pages/AdminOrderFormPage';
import { FormFactorPreview, withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────

const MOCK_IMAGES_FULL: MockImage[] = [
  { id: 'img-1', color: '#f0e6d3' }, // warm ivory
  { id: 'img-2', color: '#d4c5b0' }, // sand
  { id: 'img-3', color: '#e8d5c4' }, // blush
  { id: 'img-4', color: '#c9b8a8' }, // taupe
];

const MOCK_IMAGES_SINGLE: MockImage[] = [
  { id: 'img-1', color: '#d4c5b0' },
];

const MOCK_ADDRESS: AddressData = {
  name: 'Priya Menon',
  phone: '+91 98765 43210',
  address: '12, Koramangala 4th Block, Bengaluru, Karnataka',
  pincode: '560034',
};

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

const meta: Meta<any> = {
  title: 'Pages/Admin/OrderForm',
  component: AdminOrderFormPage,
  args: {
    ...THEME_ARGS,
    onAddImage: () => undefined,      // handled internally via local state
    onSaveAddress: (data: AddressData) => alert(`Address saved: ${JSON.stringify(data)}`),
    onSubmitOrder: () => alert('Order submitted!'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj<typeof AdminOrderFormPage>;

// ─────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────

/**
 * Empty state — no source selected, no images, no address.
 * Shows all placeholder / empty states across every section.
 */
export const EmptyState: Story = {
  name: 'Empty State',
  decorators: [withFormFactor('mobile', 'Admin Order Form (Empty)')],
  args: {
    initialSource: null,
    initialPaymentType: 'cod',
    initialSourceInput: '',
    initialImages: [],
    initialAddress: null,
    initialSheetOpen: false,
  },
};

/**
 * WhatsApp source selected — phone input visible below icons,
 * 4 reference images in the grid, address pre-filled.
 */
export const WhatsAppSourceSelected: Story = {
  name: 'WhatsApp Source',
  decorators: [withFormFactor('mobile', 'Admin Order Form (WhatsApp Source)')],
  args: {
    initialSource: 'whatsapp',
    initialPaymentType: 'cod',
    initialSourceInput: '+91 99887 76655',
    initialImages: MOCK_IMAGES_FULL,
    initialAddress: MOCK_ADDRESS,
    initialSheetOpen: false,
  },
};

/**
 * Instagram source selected — handle input visible, 1 image, address empty.
 * Demonstrates the conditional input + empty address state together.
 */
export const InstagramSourceSelected: Story = {
  name: 'Instagram Source',
  decorators: [withFormFactor('mobile', 'Admin Order Form (Instagram Source)')],
  args: {
    initialSource: 'instagram',
    initialPaymentType: 'prepaid',
    initialSourceInput: 'priya_menon_style',
    initialImages: MOCK_IMAGES_SINGLE,
    initialAddress: null,
    initialSheetOpen: false,
  },
};

/**
 * Address sheet open — WhatsApp source active, images present,
 * address pull-up sheet slides up from the bottom.
 * Best viewed by scrolling the story canvas to see the sheet overlay.
 */
export const WithAddressSheetOpen: Story = {
  name: 'Address Sheet Open',
  decorators: [withFormFactor('mobile', 'Admin Order Form (Sheet Open)')],
  args: {
    initialSource: 'whatsapp',
    initialPaymentType: 'prepaid',
    initialSourceInput: '+91 99887 76655',
    initialImages: MOCK_IMAGES_FULL,
    initialAddress: null,     // no saved address — sheet opens to fill it in
    initialSheetOpen: true,   // sheet pre-opened
  },
};

/**
 * Interactive form factors — toggle between Mobile / Tablet / Desktop
 * to verify the page's scroll and layout behaviour across viewports.
 */
export const InteractiveFormFactors: Story = {
  name: 'Form Factors',
  render: (args) => (
    <FormFactorPreview title="Admin Order Form" initialFactor="mobile">
      <AdminOrderFormPage {...args} />
    </FormFactorPreview>
  ),
  args: {
    initialSource: 'whatsapp',
    initialPaymentType: 'cod',
    initialSourceInput: '+91 98765 43210',
    initialImages: MOCK_IMAGES_FULL,
    initialAddress: MOCK_ADDRESS,
    initialSheetOpen: false,
  },
};
