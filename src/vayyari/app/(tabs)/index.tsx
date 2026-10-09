import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  ReduceMotion,
} from 'react-native-reanimated';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/authorization';
import {
  OperationsHubPage,
  UtilityGroup,
} from '@/components/tamagui-ui/pages/OperationsHubPage';
import { UtilityTileItem } from '@/components/tamagui-ui/molecules/UtilityTile';
import UtilitiesHubScreen from '@/app/utilities-hub';
import { CustomTabBar } from '@/components/CustomTabBar';
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
  LuStore,
  LuSparkles,
  LuPackage,
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
    id: 'process-orders',
    title: 'Process Orders',
    icon: <LuPackage size={36} color="#E65100" />,
    route: '/utilities/process-orders',
    color: '#E65100',
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

const STORE_UTILITIES: RawUtilityItem[] = [
  {
    id: 'store-inventory',
    title: 'Storefront',
    icon: <LuStore size={36} color="#0D9488" />,
    route: '/store/inventory',
    color: '#0D9488',
    permission: PERMISSIONS.CATALOG_VIEW,
  },
  {
    id: 'store-publish',
    title: 'Publish Batch',
    icon: <LuSparkles size={36} color="#8B5CF6" />,
    route: '/store/publish',
    color: '#8B5CF6',
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

import { useDrawerContext } from '@/utils/DrawerContext';

/**
 * UtilityScreen Component (Operations Hub)
 *
 * Serves as the central hub for all DeepLens operational, system, and administrative utilities.
 * Includes a real-time 60fps interactive drag gesture container for the Utilities Hub screen.
 */
export default function UtilityScreen() {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const drawerCtx = useDrawerContext();
  const localWidth = useWindowDimensions().width;
  const width = drawerCtx?.width ?? localWidth;

  const fallbackTranslateX = useSharedValue(-width);
  const translateX = drawerCtx?.translateX ?? fallbackTranslateX;
  const startX = useSharedValue(0);

  const springConfig = {
    damping: 22,
    stiffness: 220,
    mass: 0.8,
    reduceMotion: ReduceMotion.Never,
  };

  // Handle Android Hardware Back Button & System Back Gesture
  useEffect(() => {
    const onBackPress = () => {
      if (translateX.value > -width + 10) {
        translateX.value = withSpring(-width, springConfig);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [translateX, width]);

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
      { id: 'store', title: 'Storefront Operations', items: filterItems(STORE_UTILITIES) },
      { id: 'business', title: 'Business', items: filterItems(OPERATIONAL_UTILITIES) },
      { id: 'product', title: 'Product', items: filterItems(PRODUCT_UTILITIES) },
      { id: 'system', title: 'System', items: filterItems(SYSTEM_UTILITIES) },
      { id: 'comms', title: 'Communications', items: filterItems(COMMUNICATION_UTILITIES) },
    ];
    return rawGroups.filter((g) => g.items.length > 0);
  }, [hasPermission, isSuperAdmin]);

  // Real-time 60fps continuous pan gesture tracking
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-25, 25])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const nextPos = startX.value + e.translationX;
      translateX.value = Math.max(-width, Math.min(0, nextPos));
    })
    .onEnd((e) => {
      const progress = (translateX.value + width) / width;
      if (e.velocityX > 350) {
        translateX.value = withSpring(0, springConfig);
      } else if (e.velocityX < -350) {
        translateX.value = withSpring(-width, springConfig);
      } else if (progress > 0.4) {
        translateX.value = withSpring(0, springConfig);
      } else {
        translateX.value = withSpring(-width, springConfig);
      }
    });

  // 1:1 dual screen animation styles
  // Utilities Hub enters from -width to 0
  const utilitiesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Home Screen content slides 1:1 from 0 to +width (towards right wall)
  const homeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + width }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Home Screen Body (Operations Hub sliding towards right wall) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { zIndex: 10, backgroundColor: '#000' },
            homeAnimatedStyle,
          ]}
        >
          <OperationsHubPage
            groups={groups}
            onLaunchTool={(route) => {
              if (route) router.push(route as any);
            }}
            onOpenAiAssistant={() => router.push('/ai' as any)}
            onOpenSettings={() => router.push('/modal' as any)}
          />
        </Animated.View>

        {/* Utilities Hub Overlay Panel (Enters from left wall, NO bottom menu) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { zIndex: 20 },
            utilitiesAnimatedStyle,
          ]}
        >
          <UtilitiesHubScreen
            onDismiss={() => {
              translateX.value = withSpring(-width, springConfig);
            }}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
