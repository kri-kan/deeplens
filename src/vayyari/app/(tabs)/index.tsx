import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';
import {
  OperationsHubPage,
  UtilityGroup,
} from '@/components/tamagui-ui/pages/OperationsHubPage';
import { UtilityTileItem } from '@/components/tamagui-ui/molecules/UtilityTile';
import {
  LuHash,
  LuUsers,
  LuList,
  LuPlus,
  LuMonitor,
  LuDatabase,
  LuImage,
  LuYoutube,
  LuLink,
  LuFlaskConical,
  LuMegaphone,
  LuShield,
} from '@/components/tamagui-ui/icons/lu';
import {
  RiWhatsappLine,
  RiInstagramLine,
} from '@/components/tamagui-ui/icons/ri';

interface RawUtilityItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  color?: string;
  description?: string;
  badge?: string;
  permission?: string;
}

const OPERATIONAL_UTILITIES: RawUtilityItem[] = [
  {
    id: 'gen-id',
    title: 'Generate ID',
    icon: <LuHash size={36} color="#6200ee" />,
    route: '/utilities/order-id-generator',
    color: '#6200ee',
    permission: PERMISSIONS.ORDERS_VIEW,
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: <LuUsers size={36} color="#3f51b5" />,
    route: '/utilities/customer-management',
    color: '#3f51b5',
    permission: PERMISSIONS.CUSTOMERS_VIEW,
  },
];

const PRODUCT_UTILITIES: RawUtilityItem[] = [
  {
    id: 'view-catalog',
    title: 'Catalog',
    icon: <LuList size={36} color="#6200ee" />,
    route: '/utilities/product-list',
    color: '#6200ee',
    permission: PERMISSIONS.CATALOG_VIEW,
  },
  {
    id: 'create-product',
    title: 'Create',
    icon: <LuPlus size={36} color="#00a86b" />,
    route: '/utilities/create-product',
    color: '#00a86b',
    permission: PERMISSIONS.CATALOG_CREATE,
  },
];

const SYSTEM_UTILITIES: RawUtilityItem[] = [
  {
    id: 'system-dashboard',
    title: 'System',
    icon: <LuMonitor size={36} color="#607D8B" />,
    route: '/utilities/system-dashboard',
    color: '#607D8B',
    permission: PERMISSIONS.SYSTEM_DASHBOARD_VIEW,
  },
  {
    id: 'master-data',
    title: 'Master Data',
    icon: <LuDatabase size={36} color="#673AB7" />,
    route: '/system/master-data',
    color: '#673AB7',
    permission: PERMISSIONS.SYSTEM_MASTER_DATA_EDIT,
  },
  {
    id: 'media-settings',
    title: 'Media',
    icon: <LuImage size={36} color="#ff5722" />,
    route: '/utilities/media-settings',
    color: '#ff5722',
    permission: PERMISSIONS.SYSTEM_MEDIA_RULES_EDIT,
  },
  {
    id: 'insta-explorer',
    title: 'Explorer',
    icon: <RiInstagramLine size={36} color="#E1306C" />,
    route: '/utilities/instagram-explorer',
    color: '#E1306C',
    permission: PERMISSIONS.INSTAGRAM_VIEW,
  },
  {
    id: 'youtube-dashboard',
    title: 'YouTube',
    icon: <LuYoutube size={36} color="#FF0000" />,
    route: '/utilities/youtube-dashboard',
    color: '#FF0000',
    permission: PERMISSIONS.CATALOG_VIEW,
  },
  {
    id: 'quick-links',
    title: 'Links',
    icon: <LuLink size={36} color="#2196F3" />,
    route: '/utilities/quick-links',
    color: '#2196F3',
    permission: PERMISSIONS.SYSTEM_DASHBOARD_VIEW,
  },
  {
    id: 'whatsapp-mgmt',
    title: 'WhatsApp',
    icon: <RiWhatsappLine size={36} color="#25D366" />,
    route: '/utilities/whatsapp',
    color: '#25D366',
    permission: PERMISSIONS.WHATSAPP_VIEW,
  },
  {
    id: 'playground',
    title: 'Playground',
    icon: <LuFlaskConical size={36} color="#9C27B0" />,
    route: '/system/playground',
    color: '#9C27B0',
    permission: PERMISSIONS.SYSTEM_DASHBOARD_VIEW,
  },
];

const COMMUNICATION_UTILITIES: RawUtilityItem[] = [
  {
    id: 'campaigns',
    title: 'Campaigns',
    icon: <LuMegaphone size={36} color="#FF9800" />,
    route: '/utilities/communication-management',
    color: '#FF9800',
    permission: PERMISSIONS.WHATSAPP_BROADCAST,
  },
];

const ADMIN_UTILITIES: RawUtilityItem[] = [
  {
    id: 'user-directory',
    title: 'Users',
    icon: <LuUsers size={36} color="#6200ee" />,
    route: '/system/users',
    color: '#6200ee',
    permission: PERMISSIONS.USERS_VIEW,
  },
  {
    id: 'roles-access',
    title: 'Roles',
    icon: <LuShield size={36} color="#00897B" />,
    route: '/system/roles',
    color: '#00897B',
    permission: PERMISSIONS.ROLES_MANAGE,
  },
];

/**
 * UtilityScreen Component (Operations Hub)
 *
 * Serves as the central hub for all DeepLens operational, system, and administrative utilities.
 * Filters utility items dynamically according to user capabilities and permissions.
 * Presents lightweight icon buttons with concise labels below in a clean, compact grid.
 * Includes a swipe-right gesture detector that navigates to the AI assistant.
 */
export default function UtilityScreen() {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const filterItems = (items: RawUtilityItem[]): UtilityTileItem[] => {
    if (isSuperAdmin) {
      return items.map(({ permission, ...item }) => item);
    }
    return items
      .filter((item) => !item.permission || hasPermission(item.permission))
      .map(({ permission, ...item }) => item);
  };

  const groups: UtilityGroup[] = useMemo(() => {
    const rawGroups = [
      { id: 'admin', title: 'Administration & Access', items: filterItems(ADMIN_UTILITIES) },
      { id: 'business', title: 'Business', items: filterItems(OPERATIONAL_UTILITIES) },
      { id: 'product', title: 'Product', items: filterItems(PRODUCT_UTILITIES) },
      { id: 'system', title: 'System', items: filterItems(SYSTEM_UTILITIES) },
      { id: 'comms', title: 'Communications', items: filterItems(COMMUNICATION_UTILITIES) },
    ];
    return rawGroups.filter((g) => g.items.length > 0);
  }, [hasPermission, isSuperAdmin]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(40)
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onEnd((e) => {
      // Swipe right means finger moves from left to right (translationX > 0)
      if (e.translationX > 50) {
        router.push('/ai' as any);
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1 }}>
        <OperationsHubPage
          groups={groups}
          onLaunchTool={(route) => router.push(route as any)}
          onOpenAiAssistant={() => router.push('/ai' as any)}
          onOpenSettings={() => router.push('/modal' as any)}
        />
      </View>
    </GestureDetector>
  );
}
