import React, { useState, useMemo, useRef } from 'react';
import { ScrollView, TextInput, TouchableOpacity, Pressable, Platform, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSearch,
  LuX,
  LuSettings,
  LuSparkles,
  LuInbox,
  LuUsers,
  LuShieldCheck,
  LuStore,
  LuHash,
  LuList,
  LuPlus,
  LuMonitor,
  LuDatabase,
  LuImage,
  LuLink,
  LuFlaskConical,
  LuMegaphone,
  LuWrench,
  LuLayoutGrid,
  LuPackage,
  LuTrendingUp,
  LuPackagePlus,
  LuPencil,
  LuArrowRight,
  LuCheck,
} from 'react-icons/lu';
import { RiWhatsappFill, RiInstagramFill, RiYoutubeFill } from 'react-icons/ri';
import { useTheme } from '../../theme';
import { UtilitySection } from '../molecules/UtilitySection';
import { UtilityTileItem } from '../molecules/UtilityTile';
import { AdminOrderFormPage } from './AdminOrderFormPage';
import { OrderIdGeneratorPage } from './OrderIdGeneratorPage';
import { OrderIdHistoryEntry } from '../molecules/OrderIdHistoryItem';

export interface AdminHomeScreenProps {
  disableSafeArea?: boolean;
  searchQuery?: string;
  initialMenuOpen?: boolean;
  initialView?: 'home' | 'create-order' | 'edit-order';
  onLaunchTool?: (route: string) => void;
  onOpenAiAssistant?: () => void;
  onOpenSettings?: () => void;
  onNewOrder?: () => void;
  onEditOrder?: () => void;
  onTabChange?: (tab: 'utility' | 'studio' | 'orders' | 'insights') => void;
}

export const DEFAULT_ORDER_HISTORY: OrderIdHistoryEntry[] = [
  {
    id: '849201',
    source: 'whatsapp',
    paymentMode: 'cod',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    customerPhone: '+91 98765 43210',
    sourceHandle: '+91 98765 43210',
    isDeleted: false,
  },
  {
    id: '849198',
    source: 'instagram',
    paymentMode: 'prepaid',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    instagramHandle: '@ananya_couture',
    sourceHandle: '@ananya_couture',
    isDeleted: false,
  },
  {
    id: '849175',
    source: 'whatsapp',
    paymentMode: 'prepaid',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    customerPhone: '+91 91234 56789',
    sourceHandle: '+91 91234 56789',
    isDeleted: false,
  },
  {
    id: '849150',
    source: 'instagram',
    paymentMode: 'cod',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    instagramHandle: '@designer_sarees_hyd',
    sourceHandle: '@designer_sarees_hyd',
    isDeleted: false,
  },
  {
    id: '849122',
    source: 'none',
    paymentMode: 'cod',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    sourceHandle: 'Direct Walk-in',
    isDeleted: false,
  },
];

export interface AdminGroupData {
  id: string;
  title: string;
  items: UtilityTileItem[];
}

export const ADMIN_HOME_GROUPS: AdminGroupData[] = [
  {
    id: 'admin',
    title: 'ADMINISTRATION & ACCESS',
    items: [
      {
        id: 'users',
        title: 'Users',
        description: 'Team permissions & user accounts',
        icon: <LuUsers size={32} color="#7C3AED" />,
        route: '/system/users',
        color: '#7C3AED',
      },
      {
        id: 'roles',
        title: 'Roles',
        description: 'RBAC capability matrix & scopes',
        icon: <LuShieldCheck size={32} color="#0D9488" />,
        route: '/system/roles',
        color: '#0D9488',
      },
    ],
  },
  {
    id: 'storefront',
    title: 'STOREFRONT OPERATIONS',
    items: [
      {
        id: 'storefront',
        title: 'Storefront',
        description: 'Store inventory & live products',
        icon: <LuStore size={32} color="#0D9488" />,
        route: '/store/inventory',
        color: '#0D9488',
      },
      {
        id: 'publish-batch',
        title: 'Publish Batch',
        description: 'Batch curate & publish to store',
        icon: <LuSparkles size={32} color="#8B5CF6" />,
        route: '/store/publish',
        color: '#8B5CF6',
      },
    ],
  },
  {
    id: 'business',
    title: 'BUSINESS',
    items: [
      {
        id: 'gen-id',
        title: 'Generate ID',
        description: 'Quick order ID allocator',
        icon: <LuHash size={32} color="#7C3AED" />,
        route: '/utilities/order-id-generator',
        color: '#7C3AED',
      },
      {
        id: 'customers',
        title: 'Customers',
        description: 'CRM buyers & order histories',
        icon: <LuUsers size={32} color="#3B82F6" />,
        route: '/utilities/customer-management',
        color: '#3B82F6',
      },
    ],
  },
  {
    id: 'product',
    title: 'PRODUCT',
    items: [
      {
        id: 'catalog',
        title: 'Catalog',
        description: 'Full catalog master grid',
        icon: <LuList size={32} color="#7C3AED" />,
        route: '/utilities/product-list',
        color: '#7C3AED',
      },
      {
        id: 'create',
        title: 'Create',
        description: 'Draft new catalog product',
        icon: <LuPlus size={32} color="#10B981" />,
        route: '/utilities/create-product',
        color: '#10B981',
      },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    items: [
      {
        id: 'system',
        title: 'System',
        description: 'Dashboard & health telemetry',
        icon: <LuMonitor size={32} color="#64748B" />,
        route: '/utilities/system-dashboard',
        color: '#64748B',
      },
      {
        id: 'master-data',
        title: 'Master Data',
        description: 'Master categories & taxonomies',
        icon: <LuDatabase size={32} color="#7C3AED" />,
        route: '/system/master-data',
        color: '#7C3AED',
      },
      {
        id: 'media',
        title: 'Media',
        description: 'MinIO media settings & buckets',
        icon: <LuImage size={32} color="#F97316" />,
        route: '/utilities/media-settings',
        color: '#F97316',
      },
      {
        id: 'explorer',
        title: 'Explorer',
        description: 'Instagram reel scraper & curation',
        icon: <RiInstagramFill size={32} color="#E1306C" />,
        route: '/utilities/instagram-explorer',
        color: '#E1306C',
      },
      {
        id: 'youtube',
        title: 'YouTube',
        description: 'YouTube livestream & video hub',
        icon: <RiYoutubeFill size={32} color="#EF4444" />,
        route: '/utilities/youtube-dashboard',
        color: '#EF4444',
      },
      {
        id: 'links',
        title: 'Links',
        description: 'Shortcuts & tool redirects',
        icon: <LuLink size={32} color="#0284C7" />,
        route: '/utilities/quick-links',
        color: '#0284C7',
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp',
        description: 'Baileys sync & webhook gateway',
        icon: <RiWhatsappFill size={32} color="#22C55E" />,
        route: '/utilities/whatsapp',
        color: '#22C55E',
      },
      {
        id: 'playground',
        title: 'Playground',
        description: 'Experimentation & tool sandboxes',
        icon: <LuFlaskConical size={32} color="#9333EA" />,
        route: '/system/playground',
        color: '#9333EA',
      },
    ],
  },
  {
    id: 'comms',
    title: 'COMMUNICATIONS',
    items: [
      {
        id: 'campaigns',
        title: 'Campaigns',
        description: 'Broadcast templates & messaging',
        icon: <LuMegaphone size={32} color="#F59E0B" />,
        route: '/utilities/communication-management',
        color: '#F59E0B',
      },
    ],
  },
];

export function AdminHomeScreen({
  disableSafeArea = false,
  searchQuery = '',
  initialMenuOpen = false,
  initialView = 'home',
  onLaunchTool,
  onOpenAiAssistant,
  onOpenSettings,
  onNewOrder,
  onEditOrder,
  onTabChange,
}: AdminHomeScreenProps) {
  const { tokens, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const menuTextColor = isDark ? '#FFFFFF' : '#0F172A';
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;
  const [currentView, setCurrentView] = useState<'home' | 'create-order' | 'edit-order'>(
    initialView || 'home'
  );
  const [query, setQuery] = useState(searchQuery);
  const [activeTab, setActiveTab] = useState<'utility' | 'studio' | 'orders' | 'insights'>('utility');
  const [isMenuOpen, setIsMenuOpen] = useState(initialMenuOpen);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<any>(null);

  const showToast = (message: string) => {
    setActionFeedback(message);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setActionFeedback(null);
    }, 2800);
  };

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const handleSelectNewOrder = () => {
    setIsMenuOpen(false);
    onNewOrder?.();
    setCurrentView('create-order');
  };

  const handleSelectEditOrder = () => {
    setIsMenuOpen(false);
    onEditOrder?.();
    setCurrentView('edit-order');
  };

  const handleTabPress = (tab: 'utility' | 'studio' | 'orders' | 'insights') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Filter groups according to search input
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return ADMIN_HOME_GROUPS;

    const lower = query.toLowerCase().trim();
    return ADMIN_HOME_GROUPS.map((group) => {
      const matchedItems = group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(lower) ||
          (item.description && item.description.toLowerCase().includes(lower))
      );
      return {
        ...group,
        items: matchedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [query]);

  const totalFilteredCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [filteredGroups]);

  const [recentOrders, setRecentOrders] = useState<OrderIdHistoryEntry[]>(DEFAULT_ORDER_HISTORY);

  // If "New Order" action was selected, render the attached Create Order screen
  if (currentView === 'create-order') {
    return (
      <AdminOrderFormPage
        onNavigateBack={() => setCurrentView('home')}
        onSubmitOrder={(createdData) => {
          if (createdData) {
            const newId = String(Math.floor(849202 + Math.random() * 1000));
            const isWhatsApp = createdData.source === 'whatsapp';
            const isInstagram = createdData.source === 'instagram';
            const newEntry: OrderIdHistoryEntry = {
              id: newId,
              source: isWhatsApp ? 'whatsapp' : isInstagram ? 'instagram' : 'none',
              paymentMode: createdData.paymentType,
              timestamp: new Date().toISOString(),
              customerPhone: isWhatsApp ? createdData.sourceInput : (createdData.address?.phone || ''),
              instagramHandle: isInstagram ? createdData.sourceInput : undefined,
              sourceHandle: createdData.sourceInput,
              isDeleted: false,
            };
            setRecentOrders((prev) => [newEntry, ...prev]);
          }
          showToast('Order created successfully!');
          setCurrentView('home');
        }}
      />
    );
  }

  // If "Edit Order" action was selected, render the attached Order ID Generator / Existing Orders screen
  if (currentView === 'edit-order') {
    return (
      <OrderIdGeneratorPage
        disableSafeArea={disableSafeArea}
        initialRecentIds={recentOrders}
        onBack={() => setCurrentView('home')}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  return (
    <YStack flex={1} backgroundColor={tokens.background} position="relative" overflow="hidden">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. Header (Operations Hub, AI pill, Settings)              */}
      {/* ─────────────────────────────────────────────────────────── */}
      <XStack
        paddingTop={topInset + 6}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        zIndex={10}
      >
        <YStack gap={1}>
          <Text fontSize={18} fontWeight="800" color={tokens.text} letterSpacing={0.1}>
            Operations Hub
          </Text>
          <Text fontSize={11} color={tokens.textMuted} fontWeight="500">
            Operational modules & utilities
          </Text>
        </YStack>

        <XStack alignItems="center" gap={8}>
          {/* AI Assistant Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open AI Assistant"
            onPress={onOpenAiAssistant}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 18,
              backgroundColor: isDark ? 'rgba(217, 119, 6, 0.22)' : '#FEF3C7',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : '#FDE68A',
            }}
          >
            <LuSparkles size={14} color={isDark ? '#FBBF24' : '#D97706'} />
            <Text fontSize={12} fontWeight="800" color={isDark ? '#FBBF24' : '#B45309'}>
              AI
            </Text>
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            onPress={onOpenSettings}
            activeOpacity={0.7}
            style={{
              padding: 7,
              borderRadius: 20,
              backgroundColor: tokens.surfaceRaised,
              borderWidth: 1,
              borderColor: tokens.border,
            }}
          >
            <LuSettings size={18} color={tokens.text} />
          </TouchableOpacity>
        </XStack>
      </XStack>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. Main Scrollable Content (Search + Categories)           */}
      {/* ─────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: Math.max(90, bottomInset + 80),
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar matching screenshot */}
        <XStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.sm || 8}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal={12}
          height={40}
          alignItems="center"
          gap={8}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 1 }}
          shadowOpacity={0.03}
          shadowRadius={2}
          elevation={1}
        >
          <LuSearch size={16} color={tokens.textMuted} />
          <TextInput
            accessibilityLabel="Search operational tools input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools, modules, settings..."
            placeholderTextColor={tokens.textMuted}
            style={
              {
                flex: 1,
                fontSize: 12.5,
                color: tokens.text,
                outlineStyle: 'none',
              } as any
            }
          />
          {query.trim().length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              activeOpacity={0.7}
              style={{
                padding: 4,
                borderRadius: 12,
                backgroundColor: tokens.surfaceRaised,
              }}
            >
              <LuX size={12} color={tokens.textMuted} />
            </TouchableOpacity>
          )}
        </XStack>

        {/* Empty Search State */}
        {totalFilteredCount === 0 ? (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md || 12}
            borderWidth={1}
            borderColor={tokens.border}
            paddingVertical={40}
            paddingHorizontal={16}
            alignItems="center"
            justifyContent="center"
            gap={8}
            marginTop={20}
          >
            <XStack
              width={48}
              height={48}
              borderRadius={24}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuInbox size={24} color={tokens.textMuted} />
            </XStack>
            <Text fontSize={15} fontWeight="700" color={tokens.text}>
              No Tools Found
            </Text>
            <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={260}>
              No operational utility matches &quot;{query}&quot;. Try another keyword.
            </Text>
          </YStack>
        ) : (
          /* Render Categorized Module Groups */
          <YStack gap={16}>
            {filteredGroups.map((group) => (
              <UtilitySection
                key={group.id}
                title={group.title}
                items={group.items}
                onLaunchItem={onLaunchTool}
              />
            ))}
          </YStack>
        )}
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. Action Feedback Toast                                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      {actionFeedback && (
        <XStack
          position="absolute"
          top={topInset + 60}
          alignSelf="center"
          backgroundColor="#1E293B"
          borderRadius={24}
          paddingVertical={8}
          paddingHorizontal={16}
          alignItems="center"
          gap={8}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.2}
          shadowRadius={8}
          elevation={10}
          zIndex={10002}
        >
          <LuCheck size={16} color="#10B981" />
          <Text fontSize={12.5} fontWeight="600" color="#FFFFFF">
            {actionFeedback}
          </Text>
        </XStack>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. Blurred Background Overlay & Simple Emerging Menus      */}
      {/* ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 62 + bottomInset,
          backgroundColor: isMenuOpen
            ? isDark
              ? 'rgba(0, 0, 0, 0.72)'
              : 'rgba(255, 255, 255, 0.85)'
            : 'rgba(0, 0, 0, 0)',
          zIndex: 9999,
          pointerEvents: isMenuOpen ? 'auto' : 'none',
          ...(Platform.OS === 'web'
            ? ({
                backdropFilter: isMenuOpen ? 'blur(18px) saturate(180%)' : 'blur(0px)',
                WebkitBackdropFilter: isMenuOpen ? 'blur(18px) saturate(180%)' : 'blur(0px)',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              } as any)
            : {
                opacity: isMenuOpen ? 1 : 0,
              }),
        }}
      >
        {/* Sibling Dismiss Backdrop (receives clicks on empty areas) */}
        <Pressable
          onPress={handleCloseMenu}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Simple Menu Items emerging from below and going back down */}
        <YStack
          position="absolute"
          bottom={24}
          left={0}
          right={0}
          alignItems="center"
          gap={20}
          style={{
            pointerEvents: isMenuOpen ? 'auto' : 'none',
            transform: [{ translateY: isMenuOpen ? 0 : 50 }],
            opacity: isMenuOpen ? 1 : 0,
            ...(Platform.OS === 'web'
              ? ({
                  transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease',
                } as any)
              : {}),
          }}
        >
          {/* Simple Menu Item 1: New Order */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="New Order"
            onPress={handleSelectNewOrder}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 10,
              paddingHorizontal: 20,
              cursor: 'pointer',
              transform: [{ translateY: isMenuOpen ? 0 : 30 }],
              opacity: isMenuOpen ? 1 : 0,
              ...(Platform.OS === 'web'
                ? ({
                    transition:
                      'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.04s, opacity 0.3s ease 0.04s',
                  } as any)
                : {}),
            } as any}
          >
            <LuPackagePlus size={24} color={menuTextColor} strokeWidth={2.4} />
            <Text
              fontSize={20}
              fontWeight="700"
              color={menuTextColor}
              letterSpacing={0.4}
              style={{
                textShadowColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                textShadowOffset: { width: 0, height: isDark ? 2 : 1 },
                textShadowRadius: isDark ? 8 : 4,
              }}
            >
              New Order
            </Text>
          </TouchableOpacity>

          {/* Simple Menu Item 2: Edit Order */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit Order"
            onPress={handleSelectEditOrder}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 10,
              paddingHorizontal: 20,
              cursor: 'pointer',
              transform: [{ translateY: isMenuOpen ? 0 : 20 }],
              opacity: isMenuOpen ? 1 : 0,
              ...(Platform.OS === 'web'
                ? ({
                    transition:
                      'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease',
                  } as any)
                : {}),
            } as any}
          >
            <LuPencil size={23} color={menuTextColor} strokeWidth={2.4} />
            <Text
              fontSize={20}
              fontWeight="700"
              color={menuTextColor}
              letterSpacing={0.4}
              style={{
                textShadowColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                textShadowOffset: { width: 0, height: isDark ? 2 : 1 },
                textShadowRadius: isDark ? 8 : 4,
              }}
            >
              Edit Order
            </Text>
          </TouchableOpacity>
        </YStack>
      </View>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 5. Bottom Navigation Bar Dock                              */}
      {/* ─────────────────────────────────────────────────────────── */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        height={62 + bottomInset}
        paddingBottom={bottomInset}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        zIndex={10001}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: -3 }}
        shadowOpacity={0.06}
        shadowRadius={6}
        elevation={8}
      >
        {/* Frosted Blur Scrim directly on the bottom dock */}
        <View
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark
              ? 'rgba(0, 0, 0, 0.72)'
              : 'rgba(255, 255, 255, 0.85)',
            zIndex: 1,
            opacity: isMenuOpen ? 1 : 0,
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: isMenuOpen ? 'blur(18px) saturate(180%)' : 'blur(0px)',
                  WebkitBackdropFilter: isMenuOpen ? 'blur(18px) saturate(180%)' : 'blur(0px)',
                  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                } as any)
              : {}),
          }}
        >
          <Pressable onPress={handleCloseMenu} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        </View>

        {/* Tab 1: Utility */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Utility tab"
          onPress={isMenuOpen ? handleCloseMenu : () => handleTabPress('utility')}
          activeOpacity={0.7}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
            opacity: isMenuOpen ? 0.2 : 1,
            zIndex: 0,
          }}
        >
          <LuWrench size={20} color={activeTab === 'utility' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted} />
          <Text
            fontSize={11}
            fontWeight={activeTab === 'utility' ? '800' : '600'}
            color={activeTab === 'utility' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted}
            marginTop={2}
          >
            Utility
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Studio */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Studio tab"
          onPress={isMenuOpen ? handleCloseMenu : () => handleTabPress('studio')}
          activeOpacity={0.7}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
            opacity: isMenuOpen ? 0.2 : 1,
            zIndex: 0,
          }}
        >
          <LuLayoutGrid size={20} color={activeTab === 'studio' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted} />
          <Text
            fontSize={11}
            fontWeight={activeTab === 'studio' ? '800' : '600'}
            color={activeTab === 'studio' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted}
            marginTop={2}
          >
            Studio
          </Text>
        </TouchableOpacity>

        {/* Center Slot: Elevated Spinning FAB (+) */}
        <YStack
          width={64}
          alignItems="center"
          justifyContent="center"
          zIndex={10}
          style={{
            marginTop: -22, // Lift above the tab bar plane
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isMenuOpen ? 'Close order actions menu' : 'Open order actions menu'}
            onPress={handleToggleMenu}
            activeOpacity={0.88}
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: isDark
                ? isMenuOpen ? '#27272A' : '#3F3F46'
                : isMenuOpen ? '#1E1E22' : '#333336',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: isMenuOpen
                ? '#FDE68A'
                : isDark
                ? 'rgba(255, 255, 255, 0.22)'
                : 'rgba(255, 255, 255, 0.15)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 10,
              cursor: 'pointer',
              transform: [{ scale: 1 }],
            } as any}
          >
            {/* Spinning Plus/X Icon */}
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: isMenuOpen ? '135deg' : '0deg' }],
                ...(Platform.OS === 'web'
                  ? ({
                      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    } as any)
                  : {}),
              }}
            >
              <LuPlus size={26} color="#FFFFFF" strokeWidth={2.6} />
            </View>
          </TouchableOpacity>
        </YStack>

        {/* Tab 3: Orders */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Orders tab"
          onPress={isMenuOpen ? handleCloseMenu : () => handleTabPress('orders')}
          activeOpacity={0.7}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
            opacity: isMenuOpen ? 0.2 : 1,
            zIndex: 0,
          }}
        >
          <LuPackage size={20} color={activeTab === 'orders' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted} />
          <Text
            fontSize={11}
            fontWeight={activeTab === 'orders' ? '800' : '600'}
            color={activeTab === 'orders' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted}
            marginTop={2}
          >
            Orders
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Insights */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Insights tab"
          onPress={isMenuOpen ? handleCloseMenu : () => handleTabPress('insights')}
          activeOpacity={0.7}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
            opacity: isMenuOpen ? 0.2 : 1,
            zIndex: 0,
          }}
        >
          <LuTrendingUp size={20} color={activeTab === 'insights' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted} />
          <Text
            fontSize={11}
            fontWeight={activeTab === 'insights' ? '800' : '600'}
            color={activeTab === 'insights' ? (isDark ? '#F8FAFC' : '#0F172A') : tokens.textMuted}
            marginTop={2}
          >
            Insights
          </Text>
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
}
