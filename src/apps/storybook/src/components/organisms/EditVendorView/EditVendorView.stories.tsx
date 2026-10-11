import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  EditVendorView,
  EditVendorViewProps,
  DelhiveryWarehouseOption,
  VendorAddressItem,
  LinkedWhatsAppChat,
  EditVendorFormData,
} from './index';

export const MOCK_DELHIVERY_WAREHOUSES: DelhiveryWarehouseOption[] = [
  {
    id: 'f83ccabf-f835-4c0d-b103-a3744a0dec06',
    name: 'Hyd Central Hub',
    code: 'HYD-APT',
    alias: 'Bachupally Hub',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '502325',
    isCentral: true,
  },
  {
    id: 'e35f1872-f5a4-41bc-8f69-b4544d98d5cf',
    name: 'Vayyari Rajahmundry',
    code: 'VAY-JAANU',
    alias: 'Jaanu CTRI',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    pincode: '533106',
    isCentral: false,
  },
  {
    id: 'a933d11f-4098-4e44-a7ce-d539339a57d7',
    name: 'Surat Fabrizo Hub',
    code: 'VAY-VISHAL',
    alias: 'Vishal Fabrizo',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395010',
    isCentral: false,
  },
  {
    id: '8e3dac05-1713-402c-8720-0c1cf1f46c74',
    name: 'Vayyari Kesri Surat',
    code: 'VAY-KESRI',
    alias: 'Kesri Magob',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395012',
    isCentral: false,
  },
];

export const MOCK_VENDOR_ADDRESSES: VendorAddressItem[] = [
  {
    id: 'addr-1',
    name: 'Ramesh Patel (Primary Dispatch)',
    phone: '+91 98251 12345',
    line1: 'Shop 1042-43, Rajhans Fabrizo Market, Ring Road',
    pincode: '395002',
    city: 'Surat',
    state: 'Gujarat',
    isDefault: true,
  },
  {
    id: 'addr-2',
    name: 'Suresh Kumar (Secondary Warehouse)',
    phone: '+91 98251 67890',
    line1: 'Plot 24, GIDC Sachin Industrial Area',
    pincode: '394230',
    city: 'Surat',
    state: 'Gujarat',
    isDefault: false,
  },
];

export const MOCK_LINKED_CHATS: LinkedWhatsAppChat[] = [
  {
    jid: '919825112345@s.whatsapp.net',
    name: 'Ramesh Surat Textile',
    isGroup: false,
    assignedAt: '2026-09-15T10:30:00Z',
  },
  {
    jid: '120363028374928374@g.us',
    name: 'Vayyari Surat Dispatch Updates',
    isGroup: true,
    assignedAt: '2026-10-01T14:15:00Z',
  },
];

export const MOCK_VENDOR_DATA: EditVendorFormData = {
  id: 'vnd-surat-001',
  vendorName: 'Surat Sarees Hub',
  alias: 'Sree Sarees',
  vendorCode: 'VSTH',
  firstName: 'Ramesh',
  lastName: 'Patel',
  whatsappPrimary: '+919825112345',
  whatsappSecondary: '+919825167890',
  orderGroupLink: 'https://chat.whatsapp.com/L123456789Abc',
  email: 'suratsareeshub@gmail.com',
  notes: 'Key partner for Banarasi and georgette catalog orders.',
  isActive: true,
  isFavorite: true,
  defaultWarehouseId: 'a933d11f-4098-4e44-a7ce-d539339a57d7',
  defaultWarehouseName: 'Surat Fabrizo Hub',
  defaultWarehouseCode: 'VAY-VISHAL',
  defaultWarehouseAlias: 'Vishal Fabrizo',
};

const meta: Meta<typeof EditVendorView> = {
  title: 'Organisms/EditVendorView',
  component: EditVendorView,
  parameters: {
    formFactorShell: { defaultFactor: 'mobile' },
  },
  decorators: [
    (Story) => (
      <YStack flex={1} minHeight={680}>
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EditVendorView>;

function InteractiveEditVendor(props: Partial<EditVendorViewProps>) {
  const [vendor, setVendor] = useState<Partial<EditVendorFormData>>(
    props.initialVendor ?? MOCK_VENDOR_DATA
  );
  const [addresses, setAddresses] = useState<VendorAddressItem[]>(
    props.addresses ?? MOCK_VENDOR_ADDRESSES
  );
  const [saving, setSaving] = useState(props.saving ?? false);

  const handleSave = (data: EditVendorFormData) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setVendor(data);
      alert(`Vendor saved successfully: ${data.vendorName} (${data.vendorCode})`);
    }, 1000);
  };

  const handleSaveAddress = (
    newAddr: Omit<VendorAddressItem, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    if (id) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...newAddr } : newAddr.isDefault ? { ...a, isDefault: false } : a))
      );
    } else {
      const created: VendorAddressItem = {
        ...newAddr,
        id: `addr-${Date.now()}`,
      };
      setAddresses((prev) => [
        created,
        ...(newAddr.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev),
      ]);
    }
  };

  const handleDeleteAddress = (addrId: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== addrId));
  };

  return (
    <EditVendorView
      initialVendor={vendor}
      isNew={props.isNew ?? false}
      warehouses={props.warehouses ?? MOCK_DELHIVERY_WAREHOUSES}
      addresses={addresses}
      linkedChats={props.linkedChats ?? MOCK_LINKED_CHATS}
      saving={saving}
      onSave={handleSave}
      onBack={() => alert('Back pressed')}
      onSaveAddress={handleSaveAddress}
      onDeleteAddress={handleDeleteAddress}
      onNavigateChat={(jid) => alert(`Navigate to chat: ${jid}`)}
      {...props}
    />
  );
}

// 1. Default / Rest: Existing active vendor with assigned warehouse & addresses
export const DefaultExistingVendor: Story = {
  render: () => <InteractiveEditVendor />,
};

// 2. New Vendor / Empty State: Fresh partner onboarding form
export const NewVendorCreation: Story = {
  render: () => (
    <InteractiveEditVendor
      isNew={true}
      initialVendor={{
        vendorName: '',
        alias: '',
        vendorCode: 'VNEW01',
        isActive: true,
        isFavorite: false,
      }}
      addresses={[]}
      linkedChats={[]}
    />
  ),
};

// 3. Loading State: Profile loading skeleton
export const LoadingState: Story = {
  render: () => <EditVendorView loading={true} />,
};

// 4. Saving State: In-flight submission spinner
export const SavingState: Story = {
  render: () => (
    <InteractiveEditVendor
      saving={true}
    />
  ),
};

// 5. Validation Error State: Missing required fields
export const ValidationErrorState: Story = {
  render: () => (
    <InteractiveEditVendor
      initialVendor={{
        vendorName: '',
        vendorCode: 'AB', // invalid length
      }}
      initialErrors={{
        vendorName: 'Vendor Name is required',
        vendorCode: 'Vendor Code must be between 3 and 8 characters',
      }}
    />
  ),
};

// 6. With Warehouse Picker Modal Open
export const WithWarehouseModalOpen: Story = {
  render: () => (
    <InteractiveEditVendor
      initialWarehouseSheetOpen={true}
    />
  ),
};

// 7. With Address Modal Open
export const WithAddressModalOpen: Story = {
  render: () => (
    <InteractiveEditVendor
      initialAddressModalOpen={true}
    />
  ),
};
