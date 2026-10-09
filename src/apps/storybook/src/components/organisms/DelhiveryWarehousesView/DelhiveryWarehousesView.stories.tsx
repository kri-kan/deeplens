import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack } from 'tamagui';
import {
  DelhiveryWarehousesView,
  DelhiveryWarehousesViewProps,
  DelhiveryWarehouseItem,
} from './index';

export const REAL_DELHIVERY_WAREHOUSES: DelhiveryWarehouseItem[] = [
  {
    id: 'f83ccabf-f835-4c0d-b103-a3744a0dec06',
    name: 'Hyd apartment',
    code: 'HYD-APT',
    addressLine1: '103,krcr Sri ganesh residency, krcr harithavanam colony, bachupally',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '502325',
    phone: '+918712121272',
    contactPerson: 'Sowjanya',
    isCentral: true,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.195Z',
  },
  {
    id: 'e3fe7605-f831-48c7-b9b4-125bd501f46f',
    name: 'Nrt shop',
    code: 'NRT-SHOP',
    addressLine1: 'D.no.1_19_99/1',
    city: 'Narasaraopet',
    state: 'Andhra Pradesh',
    pincode: '522601',
    phone: '+918712121272',
    contactPerson: '8712121272',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.198Z',
  },
  {
    id: 'e35f1872-f5a4-41bc-8f69-b4544d98d5cf',
    name: 'vayyari jaanu',
    code: 'VAY-JAANU',
    addressLine1: '101, ramya residency, hanuman temple street, bhaskar nagar, CTRI, east godavari',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    pincode: '533106',
    phone: '+918686668338',
    contactPerson: 'jaanu',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.201Z',
  },
  {
    id: 'bb96523a-745f-484c-95f8-d8b9f0bb066d',
    name: 'vayyari raza',
    code: 'VAY-RAZA',
    addressLine1: 'Farhan Creation, Near Jama Masjid, Agras Fatehganj West, bareilly, Uttar Pradesh',
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    pincode: '243501',
    phone: '+918126992820',
    contactPerson: 'Ms Raza',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.202Z',
  },
  {
    id: 'a933d11f-4098-4e44-a7ce-d539339a57d7',
    name: 'vayyari vishal',
    code: 'VAY-VISHAL',
    addressLine1: 'shop no C-1141-1142, The Rajhans Fabrizo, near kangaroo circle, magob, Surat',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395010',
    phone: '+918469124177',
    contactPerson: 'vishal',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.203Z',
  },
  {
    id: 'a2ed0269-d2b1-4745-99ce-a86ddc5d6185',
    name: 'return vayyari raza',
    code: 'RET-VAY-RAZA',
    addressLine1: 'Farhan Creation, Near Jama Masjid, Agras Fatehganj West, bareilly, Uttar Pradesh',
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    pincode: '243501',
    phone: '+918126992820',
    contactPerson: 'Ms Raza',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.204Z',
  },
  {
    id: '8e3dac05-1713-402c-8720-0c1cf1f46c74',
    name: 'Vayyari kesri',
    code: 'VAY-KESRI',
    addressLine1: '1016-17, 1ST FLOOR, RAJHANS FABRIZO, GODADRA-DINDOLI ROAD, MAGOB, SURAT',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395012',
    phone: '+919316673591',
    contactPerson: 'Kesri creations',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.205Z',
  },
  {
    id: '8224860b-e406-4278-8fd0-b156a5e64851',
    name: 'Gowtam surat MF',
    code: 'GOWTAM-SURAT',
    addressLine1: '239 Sweet residency OPP Gopinath society Kosad bus depo Kosad Surat',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '394107',
    phone: '+917284842910',
    contactPerson: 'Gowtam',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.206Z',
  },
  {
    id: '808132da-e45e-4274-a7cd-4031838749e8',
    name: 'Vayyari faizal',
    code: 'VAY-FAIZAL',
    addressLine1: '475 Rabri tola shamat gang old city Bareilly',
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    pincode: '243005',
    phone: '+918534901963',
    contactPerson: 'Danish',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.207Z',
  },
  {
    id: '74417e78-fb4c-4582-b544-5ea9b10df0e4',
    name: 'return vayyari V make',
    code: 'RET-VAY-VMAKE',
    addressLine1: 'shop no : 5032, rajhans fabrizo, near kangaroo circle, surat road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395010',
    phone: '+919166487021',
    contactPerson: 'mds sarees',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.207Z',
  },
  {
    id: '709ef0fb-94bd-4bd3-aad9-241aeb860452',
    name: 'return vayyari priya',
    code: 'RET-VAY-PRIYA',
    addressLine1: 'shop no : 107, samskruti ac market, near capital square, gododara',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395012',
    phone: '+917069201481',
    contactPerson: 'priya',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.208Z',
  },
  {
    id: '5877362a-02f6-4c69-84b4-80c42079c7d8',
    name: 'vayyari v-make',
    code: 'VAY-VMAKE',
    addressLine1: 'shop no : 5032, rajhans fabrizo, near kangaroo circle, surat road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395010',
    phone: '+919166487021',
    contactPerson: 'mds sarees',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.209Z',
  },
  {
    id: '4dec9798-14f1-480b-9900-5719fa40fe1a',
    name: 'vayyari MK',
    code: 'VAY-MK',
    addressLine1: 'sanskriti ac market, 120 , shakti nagar, surat',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395010',
    phone: '+918619933784',
    contactPerson: 'mayank',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.210Z',
  },
  {
    id: '1a5ae8f1-f218-4b02-99f6-f8a42fab8887',
    name: 'vayyari priya',
    code: 'VAY-PRIYA',
    addressLine1: 'shop no : 107, samskruti ac market, near capital square, gododara',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395012',
    phone: '+917069201481',
    contactPerson: 'priya',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.211Z',
  },
  {
    id: '17641d47-89a4-4e12-928b-a30c7ed0373a',
    name: 'Return vayyari faizal',
    code: 'RET-VAY-FAIZAL',
    addressLine1: '475 Rabri tola shamat gang old city Bareilly',
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    pincode: '243005',
    phone: '+918534901963',
    contactPerson: 'Danish',
    isCentral: false,
    isActive: true,
    registeredWithDelhivery: true,
    createdAt: '2026-10-09T17:13:25.212Z',
  },
];

const meta: Meta<typeof DelhiveryWarehousesView> = {
  title: 'Organisms/DelhiveryWarehousesView',
  component: DelhiveryWarehousesView,
  parameters: {
    formFactorShell: { defaultFactor: 'desktop' },
  },
  decorators: [
    (Story) => (
      <YStack flex={1} minHeight={600}>
        <Story />
      </YStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DelhiveryWarehousesView>;

function InteractiveDelhiveryWarehouses(props: Partial<DelhiveryWarehousesViewProps>) {
  const [warehouses, setWarehouses] = useState<DelhiveryWarehouseItem[]>(
    props.warehouses ?? REAL_DELHIVERY_WAREHOUSES
  );
  const [search, setSearch] = useState(props.searchQuery ?? '');
  const [syncing, setSyncing] = useState(props.syncing ?? false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    props.lastSyncedAt ?? '2026-10-09T17:13:25Z'
  );

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSyncedAt(new Date().toISOString());
    }, 1200);
  };

  const handleAddFacility = () => {
    const newId = `wh-${Date.now()}`;
    const newFacility: DelhiveryWarehouseItem = {
      id: newId,
      name: `New Hub ${warehouses.length + 1}`,
      code: `HUB-${warehouses.length + 1}`,
      addressLine1: 'Plot 42, Logistics Park, Phase 1',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      phone: '+919999999999',
      contactPerson: 'Operations Lead',
      isCentral: false,
      isActive: true,
      registeredWithDelhivery: true,
    };
    setWarehouses((prev) => [newFacility, ...prev]);
  };

  const handleDeleteFacility = (wh: DelhiveryWarehouseItem) => {
    setWarehouses((prev) => prev.filter((item) => item.id !== wh.id));
  };

  return (
    <DelhiveryWarehousesView
      warehouses={warehouses}
      searchQuery={search}
      onSearchChange={setSearch}
      syncing={syncing}
      lastSyncedAt={lastSyncedAt}
      onSync={handleSync}
      onAddFacility={handleAddFacility}
      onEditFacility={(wh: DelhiveryWarehouseItem) => {
        alert(`Edit facility: ${wh.name} (${wh.code})`);
      }}
      onDeleteFacility={handleDeleteFacility}
      {...props}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveDelhiveryWarehouses />,
};

export const Loading: Story = {
  render: () => (
    <DelhiveryWarehousesView
      warehouses={[]}
      loading={true}
      onSync={() => {}}
      onAddFacility={() => {}}
    />
  ),
};

export const Syncing: Story = {
  render: () => (
    <InteractiveDelhiveryWarehouses
      syncing={true}
      lastSyncedAt="2026-10-09T17:13:25Z"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <InteractiveDelhiveryWarehouses
      warehouses={[]}
    />
  ),
};

export const WithSearch: Story = {
  render: () => (
    <InteractiveDelhiveryWarehouses
      searchQuery="Surat"
    />
  ),
};
