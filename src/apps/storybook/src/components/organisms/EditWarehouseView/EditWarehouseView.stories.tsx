import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  EditWarehouseView,
  EditWarehouseViewProps,
  EditWarehouseFormData,
} from './index';

export const MOCK_WAREHOUSE_SURAT: EditWarehouseFormData = {
  id: '8224860b-e406-4278-8fd0-b156a5e64851',
  name: 'Gowtam surat MF',
  alias: 'Surat Godown',
  code: 'GOWTAM-SURAT',
  addressLine1: '239 Sweet residency, OPP Gopinath society, Kosad bus depo',
  addressLine2: 'Kosad',
  city: 'Surat',
  state: 'Gujarat',
  pincode: '394107',
  phone: '+917284842910',
  contactPerson: 'Gowtam Patel',
  isCentral: false,
  isStarred: false,
  isActive: true,
  syncWithDelhivery: true,
};

export const MOCK_WAREHOUSE_CENTRAL: EditWarehouseFormData = {
  id: 'f83ccabf-f835-4c0d-b103-a3744a0dec06',
  name: 'Hyd apartment',
  alias: 'Bachupally Flat',
  code: 'HYD-APT',
  addressLine1: '103, KRCR Sri Ganesh Residency, KRCR Harithavanam Colony',
  addressLine2: 'Near Pragathi Nagar Road, Bachupally',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '502325',
  phone: '+918712121272',
  contactPerson: 'Sowjanya',
  isCentral: true,
  isStarred: true,
  isActive: true,
  syncWithDelhivery: true,
};

const meta: Meta<typeof EditWarehouseView> = {
  title: 'Organisms/EditWarehouseView',
  component: EditWarehouseView,
  decorators: [
    (Story) => (
      <YStack flex={1} backgroundColor="#F8FAFC" minHeight={800}>
        <Story />
      </YStack>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof EditWarehouseView>;

function InteractiveEditWarehouse(props: Partial<EditWarehouseViewProps>) {
  const [warehouse, setWarehouse] = useState<Partial<EditWarehouseFormData>>(
    props.initialWarehouse || MOCK_WAREHOUSE_SURAT
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: EditWarehouseFormData) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setWarehouse(data);
    setSaving(false);
    alert(`Warehouse saved: ${data.name} (Alias: ${data.alias || 'None'}, Code: ${data.code})`);
  };

  return (
    <EditWarehouseView
      {...props}
      initialWarehouse={warehouse}
      saving={saving}
      onSave={handleSave}
      onBack={() => alert('Back pressed')}
      onDelete={(id) => alert(`Delete warehouse ID: ${id}`)}
      onToggleStar={() => setWarehouse((prev) => ({ ...prev, isStarred: !prev.isStarred }))}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveEditWarehouse />,
};

export const CentralHub: Story = {
  render: () => (
    <InteractiveEditWarehouse
      initialWarehouse={MOCK_WAREHOUSE_CENTRAL}
    />
  ),
};

export const NewFacility: Story = {
  render: () => (
    <InteractiveEditWarehouse
      isNew={true}
      initialWarehouse={{
        name: '',
        alias: '',
        code: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        contactPerson: '',
        isCentral: false,
        isActive: true,
        syncWithDelhivery: true,
      }}
    />
  ),
};

export const ValidationErrors: Story = {
  render: () => (
    <EditWarehouseView
      initialWarehouse={{
        name: '',
        code: '',
        addressLine1: '',
        city: '',
        state: '',
        pincode: '123',
        phone: '',
      }}
      initialErrors={{
        name: 'Facility name is required',
        code: 'Facility code is required',
        addressLine1: 'Address line 1 is required',
        city: 'City is required',
        state: 'State is required',
        pincode: 'Pincode must be 6 digits',
        phone: 'Phone number is required',
      }}
    />
  ),
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Saving: Story = {
  render: () => (
    <EditWarehouseView
      initialWarehouse={MOCK_WAREHOUSE_SURAT}
      saving={true}
    />
  ),
};

export const WithoutDelhiverySync: Story = {
  render: () => (
    <InteractiveEditWarehouse
      initialWarehouse={{
        ...MOCK_WAREHOUSE_SURAT,
        name: 'Internal Storage Godown',
        alias: 'Ring Road Depot',
        code: 'RING-RD-01',
        syncWithDelhivery: false,
      }}
    />
  ),
};
