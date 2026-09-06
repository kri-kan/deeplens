import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  OperationsHubPage,
  OperationsHubPageProps,
  UtilityGroup,
} from '../../components/pages/OperationsHubPage';
import {
  LuTag,
  LuUsers,
  LuShieldCheck,
  LuShoppingBag,
  LuPlus,
  LuLayoutDashboard,
  LuDatabase,
  LuImage,
  LuExternalLink,
  LuMegaphone,
  LuTruck,
} from 'react-icons/lu';
import { RiWhatsappFill, RiInstagramFill } from 'react-icons/ri';
import { withFormFactor } from '../utils/FormFactorPreview';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const MOCK_GROUPS: UtilityGroup[] = [
  {
    id: 'admin',
    title: 'Administration & Access',
    items: [
      {
        id: 'user-dir',
        title: 'User Directory',
        description: 'Team permissions & roles',
        icon: <LuUsers size={30} color="#6366F1" />,
        route: '/system/users',
        color: '#6366F1',
      },
      {
        id: 'roles-access',
        title: 'Roles & Access',
        description: 'RBAC capability matrix',
        icon: <LuShieldCheck size={30} color="#0D9488" />,
        route: '/system/roles',
        color: '#0D9488',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business & Operations',
    items: [
      {
        id: 'gen-id',
        title: 'Generate ID',
        description: 'Quick order ID allocator',
        icon: <LuTag size={30} color="#8B5CF6" />,
        route: '/utilities/order-id-generator',
        color: '#8B5CF6',
        badge: 'FAST',
      },
      {
        id: 'customers',
        title: 'Customers',
        description: 'CRM directory & buyer history',
        icon: <LuUsers size={30} color="#3B82F6" />,
        route: '/utilities/customer-management',
        color: '#3B82F6',
      },
      {
        id: 'order-ledger',
        title: 'Order Ledger',
        description: 'Dispatch & logistics pipeline',
        icon: <LuTruck size={30} color="#10B981" />,
        route: '/orders',
        color: '#10B981',
      },
    ],
  },
  {
    id: 'product',
    title: 'Product Management',
    items: [
      {
        id: 'catalog',
        title: 'Catalog',
        description: 'Full inventory & price grid',
        icon: <LuShoppingBag size={30} color="#EC4899" />,
        route: '/utilities/product-list',
        color: '#EC4899',
      },
      {
        id: 'create-product',
        title: 'Create Product',
        description: 'Add new SKU to catalog',
        icon: <LuPlus size={30} color="#10B981" />,
        route: '/utilities/create-product',
        color: '#10B981',
      },
    ],
  },
  {
    id: 'system',
    title: 'System & Integrations',
    items: [
      {
        id: 'system-dashboard',
        title: 'System Dashboard',
        description: 'Health, Redis & Postgres',
        icon: <LuLayoutDashboard size={30} color="#64748B" />,
        route: '/utilities/system-dashboard',
        color: '#64748B',
      },
      {
        id: 'master-data',
        title: 'Master Data',
        description: 'Categories & attributes',
        icon: <LuDatabase size={30} color="#8B5CF6" />,
        route: '/system/master-data',
        color: '#8B5CF6',
      },
      {
        id: 'media-settings',
        title: 'Media Settings',
        description: 'MinIO rules & compression',
        icon: <LuImage size={30} color="#F97316" />,
        route: '/utilities/media-settings',
        color: '#F97316',
      },
      {
        id: 'insta-explorer',
        title: 'Instagram Explorer',
        description: 'Media scraper & reels',
        icon: <RiInstagramFill size={30} color="#E1306C" />,
        route: '/utilities/instagram-explorer',
        color: '#E1306C',
      },
      {
        id: 'whatsapp-mgmt',
        title: 'WhatsApp Hub',
        description: 'Baileys sync & webhook',
        icon: <RiWhatsappFill size={30} color="#25D366" />,
        route: '/utilities/whatsapp',
        color: '#25D366',
      },
      {
        id: 'quick-links',
        title: 'Quick Links',
        description: 'Shortcuts & tool redirects',
        icon: <LuExternalLink size={30} color="#0284C7" />,
        route: '/utilities/quick-links',
        color: '#0284C7',
      },
    ],
  },
  {
    id: 'communications',
    title: 'Communications',
    items: [
      {
        id: 'campaigns',
        title: 'Campaigns',
        description: 'WhatsApp broadcast templates',
        icon: <LuMegaphone size={30} color="#F59E0B" />,
        route: '/utilities/communication-management',
        color: '#F59E0B',
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────

const meta: Meta<any> = {
  title: 'Pages/Admin/OperationsHub',
  component: OperationsHubPage,
  args: {
    ...THEME_ARGS,
    disableSafeArea: false,
    groups: MOCK_GROUPS,
    onLaunchTool: (route: string) => alert(`Launching: ${route}`),
    onOpenAiAssistant: () => alert('Opening AI Assistant (/ai)'),
    onOpenSettings: () => alert('Opening Settings (/modal)'),
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    disableSafeArea: {
      control: 'boolean',
      description: 'Disable safe area insets inside storybook device frame',
    },
  },
};

export default meta;
type Story = StoryObj<any>;

// ─────────────────────────────────────────────
// Stories: 7-State UI Validation
// ─────────────────────────────────────────────

/**
 * 1. SuperAdmin Operations Hub (Default Mobile View)
 * Shows all 5 operational groups with tactile bento cards and launch routes.
 */
export const SuperAdminHub: Story = {
  name: '1. SuperAdmin Hub (Mobile)',
  decorators: [withFormFactor('mobile', 'Operations Hub - SuperAdmin')],
  args: {
    disableSafeArea: true,
    groups: MOCK_GROUPS,
  },
};

/**
 * 2. Filtered Staff View (Role-based capabilities)
 * Only Business and Product sections visible for catalog operators.
 */
export const StaffOperatorHub: Story = {
  name: '2. Staff Operator View (Role Filtered)',
  decorators: [withFormFactor('mobile', 'Operations Hub - Staff Operator')],
  args: {
    disableSafeArea: true,
    groups: MOCK_GROUPS.filter((g) => g.id === 'business' || g.id === 'product'),
  },
};

/**
 * 3. Search Filter Active
 * Search query "order" filters matching tools across groups.
 */
export const SearchFilterActive: Story = {
  name: '3. Search Filter Active ("order")',
  decorators: [withFormFactor('mobile', 'Operations Hub - Search Filter')],
  args: {
    disableSafeArea: true,
    groups: MOCK_GROUPS,
    searchQuery: 'order',
  },
};

/**
 * 4. Zero Search Matches
 * Empty state when a query returns no matching tools.
 */
export const ZeroSearchMatches: Story = {
  name: '4. Zero Search Matches',
  decorators: [withFormFactor('mobile', 'Operations Hub - Zero Matches')],
  args: {
    disableSafeArea: true,
    groups: MOCK_GROUPS,
    searchQuery: 'xyz-nonexistent-tool',
  },
};

/**
 * 5. Responsive Tablet Hub
 * Wide tablet viewport bento layout.
 */
export const TabletHub: Story = {
  name: '5. Tablet / Wide Viewport',
  decorators: [withFormFactor('tablet', 'Operations Hub - Tablet')],
  args: {
    disableSafeArea: true,
    groups: MOCK_GROUPS,
  },
};
