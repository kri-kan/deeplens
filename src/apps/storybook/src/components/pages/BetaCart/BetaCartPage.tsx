import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuCheck,
  LuTrash2,
  LuHeart,
  LuShoppingBag,
  LuShare2,
  LuCopy,
  LuStore,
  LuSparkles,
  LuArrowLeft,
  LuShieldCheck,
  LuClock,
} from 'react-icons/lu';
import { RiWhatsappLine } from 'react-icons/ri';
import { useTheme, useResponsive } from '../../../theme';
import { MyntraStyleCartItem, CartItemData } from '../../molecules/CartItem/MyntraStyleCartItem';
export type { CartItemData };

export const INITIAL_BETA_CART_ITEMS: CartItemData[] = [
  {
    id: 'c1',
    brand: 'Vayyari Heritage',
    name: 'Kanjivaram Pure Silk Saree (SAR-KAN-901)',
    seller: 'VAYYARI DIRECT HANDLOOM',
    colorName: 'Emerald Green',
    colorTemplate: 'solid',
    primaryColor: 'Emerald Green',
    size: 'Free Size',
    availableSizes: ['Free Size'],
    quantity: 1,
    price: 10999,
    originalPrice: 14999,
    gradient: ['#1B4D3E', '#0d281e'],
    returnDays: 7,
    selected: true,
  },
  {
    id: 'c2',
    brand: 'Vayyari Royal',
    name: 'Banarasi Royal Brocade Saree (SAR-BAN-402)',
    seller: 'VAYYARI DIRECT HANDLOOM',
    colorName: 'Crimson Red',
    colorTemplate: 'solid',
    primaryColor: 'Crimson Red',
    size: 'Free Size',
    availableSizes: ['Free Size'],
    quantity: 1,
    price: 8499,
    originalPrice: 12999,
    gradient: ['#9B111E', '#4a080e'],
    returnDays: 7,
    stockLeft: 2,
    selected: true,
  },
];

export type BetaCartPageProps = {
  initialItems?: CartItemData[];
  isSharedView?: boolean;
  shareToken?: string;
  onNavigateHome?: () => void;
  onNavigatePDP?: (productId?: string) => void;
  onShareWhatsApp?: (message: string, shareUrl: string) => void;
  onImportToVayyariOrder?: (items: CartItemData[]) => void;
};

export function BetaCartPage({
  initialItems = INITIAL_BETA_CART_ITEMS,
  isSharedView = false,
  shareToken = 'crt_9x8k2m',
  onNavigateHome,
  onNavigatePDP,
  onShareWhatsApp,
  onImportToVayyariOrder,
}: BetaCartPageProps) {
  const { tokens } = useTheme();
  const { isMobile, isDesktop } = useResponsive();

  const [items, setItems] = useState<CartItemData[]>(initialItems);
  const [copiedLink, setCopiedLink] = useState(false);

  // Selected items filtering
  const selectedItems = items.filter((i) => i.selected);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  const handleToggleSelectAll = () => {
    const nextState = !isAllSelected;
    setItems((prev) => prev.map((item) => ({ ...item, selected: nextState })));
  };

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleQuantityChange = (id: string, newQty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleSizeChange = (id: string, newSize: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, size: newSize } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveSelected = () => {
    setItems((prev) => prev.filter((item) => !item.selected));
  };

  // Price calculations (Beta: No coupon, No artisan donation)
  const totalMRP = selectedItems.reduce((acc, i) => acc + i.originalPrice * i.quantity, 0);
  const totalSellingPrice = selectedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const totalDiscount = totalMRP - totalSellingPrice;
  const finalTotal = totalSellingPrice;

  const cartShareUrl = `https://store.vayyari.com/cart/share/${shareToken}`;

  const generateWhatsAppMessage = () => {
    const lines = selectedItems.map(
      (item, idx) => `${idx + 1}. ${item.name} (${item.quantity}x) - ₹${(item.price * item.quantity).toLocaleString('en-IN')}`
    );

    return `Hi Vayyari! ✨ I'd like to place an order for the items in my bag:\n\n${lines.join('\n')}\n\n*Total Amount:* ₹${finalTotal.toLocaleString('en-IN')} (${selectedItems.length} items)\n*Cart Link:* ${cartShareUrl}`;
  };

  const handleTriggerWhatsApp = () => {
    const msg = generateWhatsAppMessage();
    onShareWhatsApp?.(msg, cartShareUrl);
    const encoded = encodeURIComponent(msg);
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/919999999999?text=${encoded}`, '_blank');
    }
  };

  const handleCopyShareLink = () => {
    setCopiedLink(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cartShareUrl);
    }
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <YStack flex={1} backgroundColor={tokens.background} minHeight="100%">
      {/* ── SHARED CART SALES BANNER (When accessed via share link by sales concierge) ── */}
      {isSharedView && (
        <XStack
          backgroundColor="#1B4D3E"
          paddingVertical={10}
          paddingHorizontal={16}
          justifyContent="space-between"
          alignItems="center"
          gap={12}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <LuStore size={18} color="#ffffff" />
            <Text fontSize={12} fontWeight="700" color="#ffffff">
              Viewing Shared Customer Bag · Share Token: <Text fontWeight="900">{shareToken}</Text>
            </Text>
          </XStack>
          {onImportToVayyariOrder && (
            <Pressable
              onPress={() => onImportToVayyariOrder(selectedItems)}
              style={
                {
                  backgroundColor: '#ffffff',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  cursor: 'pointer',
                } as any
              }
            >
              <Text fontSize={11} fontWeight="800" color="#1B4D3E">
                Import to Order Builder ➔
              </Text>
            </Pressable>
          )}
        </XStack>
      )}

      {/* ── DEDICATED BETA CART HEADER (Zero multi-step friction) ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={isDesktop ? 32 : 16}
        paddingVertical={14}
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack alignItems="center" gap={12}>
          <Pressable
            onPress={onNavigateHome}
            style={
              {
                padding: 6,
                borderRadius: 8,
                backgroundColor: tokens.surfaceRaised,
                cursor: 'pointer',
              } as any
            }
          >
            <LuArrowLeft size={18} color={tokens.text} />
          </Pressable>
          <YStack>
            <XStack alignItems="center" gap={6}>
              <Text fontSize={16} fontWeight="900" color={tokens.text} letterSpacing={0.3}>
                VAYYARI STORE
              </Text>
              <XStack
                backgroundColor="#FEF3C7"
                borderColor="#F59E0B"
                borderWidth={1}
                paddingHorizontal={6}
                paddingVertical={2}
                borderRadius={4}
              >
                <Text fontSize={10} fontWeight="900" color="#92400E">
                  BETA BAG
                </Text>
              </XStack>
            </XStack>
            <Text fontSize={11} color={tokens.textSecondary}>
              Zero-signup instant checkout & WhatsApp handoff
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={8}>
          <LuClock size={14} color={tokens.textMuted} />
          <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
            30-Day Device Sync
          </Text>
        </XStack>
      </XStack>

      {items.length === 0 ? (
        /* Empty Cart State */
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingVertical={60}
          paddingHorizontal={20}
          gap={16}
        >
          <XStack
            width={80}
            height={80}
            borderRadius={tokens.radius.full}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
          >
            <LuShoppingBag size={36} color={tokens.textMuted} />
          </XStack>
          <YStack alignItems="center" gap={6}>
            <Text fontSize={20} fontWeight="900" color={tokens.text}>
              Your bag is empty!
            </Text>
            <Text fontSize={13} color={tokens.textMuted} textAlign="center" maxWidth={300}>
              Discover handcrafted sarees and ethnic edits directly from Instagram & PWA.
            </Text>
          </YStack>
          <XStack
            cursor="pointer"
            backgroundColor={tokens.accent}
            paddingHorizontal={28}
            paddingVertical={12}
            borderRadius={8}
            onPress={onNavigateHome}
            hoverStyle={{ opacity: 0.9 }}
          >
            <Text fontSize={13} fontWeight="800" color={tokens.accentForeground} letterSpacing={0.5}>
              EXPLORE ETHNIC CATALOG ➔
            </Text>
          </XStack>
        </YStack>
      ) : (
        /* Populated Cart Content */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingTop: 16,
            paddingBottom: isMobile ? 130 : 60,
            maxWidth: 1100,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <XStack
            flexDirection={isDesktop ? 'row' : 'column'}
            gap={24}
            alignItems={isDesktop ? 'flex-start' : 'stretch'}
          >
            {/* Left Column: Cart Items & Share Link */}
            <YStack flex={isDesktop ? 1.5 : undefined} width="100%" gap={16}>
              {/* Anonymous Device Synced Bag Banner */}
              <XStack
                backgroundColor={`${tokens.accent}12`}
                borderWidth={1}
                borderColor={`${tokens.accent}35`}
                borderRadius={10}
                padding={12}
                alignItems="center"
                justifyContent="space-between"
              >
                <XStack alignItems="center" gap={10} flex={1}>
                  <LuSparkles size={18} color={tokens.accent} />
                  <YStack flex={1}>
                    <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                      Device-Synced Bag (Beta Phase)
                    </Text>
                    <Text fontSize={11} color={tokens.textSecondary}>
                      Items are automatically saved to this device for 30 days without needing signup.
                    </Text>
                  </YStack>
                </XStack>
              </XStack>

              {/* Select All & Selection Actions Bar */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingVertical={8}
                paddingHorizontal={4}
                borderBottomWidth={1}
                borderBottomColor={tokens.border}
              >
                <XStack
                  alignItems="center"
                  gap={8}
                  cursor="pointer"
                  onPress={handleToggleSelectAll}
                >
                  <XStack
                    width={18}
                    height={18}
                    borderRadius={4}
                    borderWidth={1.5}
                    borderColor={isAllSelected ? tokens.accent : tokens.border}
                    backgroundColor={isAllSelected ? tokens.accent : 'transparent'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isAllSelected && <LuCheck size={12} color="#ffffff" />}
                  </XStack>
                  <Text fontSize={13} fontWeight="700" color={tokens.text}>
                    {selectedItems.length}/{items.length} ITEMS SELECTED
                  </Text>
                </XStack>

                <XStack alignItems="center" gap={16}>
                  <Text
                    fontSize={12}
                    fontWeight="700"
                    color={tokens.textMuted}
                    cursor="pointer"
                    hoverStyle={{ color: '#e53935' }}
                    onPress={handleRemoveSelected}
                  >
                    REMOVE
                  </Text>
                </XStack>
              </XStack>

              {/* Line Items List */}
              <YStack gap={12}>
                {items.map((item) => (
                  <MyntraStyleCartItem
                    key={item.id}
                    item={item}
                    onToggleSelect={handleToggleItem}
                    onQuantityChange={handleQuantityChange}
                    onSizeChange={handleSizeChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </YStack>

              {/* Shareable Cart Link Box */}
              <YStack
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={10}
                padding={14}
                gap={8}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap={6}>
                    <LuShare2 size={15} color={tokens.accent} />
                    <Text fontSize={12} fontWeight="800" color={tokens.text}>
                      Shareable Cart Link
                    </Text>
                  </XStack>
                  <Pressable
                    onPress={handleCopyShareLink}
                    style={
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: copiedLink ? `${tokens.accent}20` : tokens.surfaceRaised,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        cursor: 'pointer',
                      } as any
                    }
                  >
                    {copiedLink ? (
                      <LuCheck size={12} color={tokens.accent} />
                    ) : (
                      <LuCopy size={12} color={tokens.textSecondary} />
                    )}
                    <Text
                      fontSize={10}
                      fontWeight="800"
                      color={copiedLink ? tokens.accent : tokens.textSecondary}
                    >
                      {copiedLink ? 'COPIED!' : 'COPY LINK'}
                    </Text>
                  </Pressable>
                </XStack>
                <Text fontSize={11} color={tokens.textMuted}>
                  {cartShareUrl}
                </Text>
              </YStack>
            </YStack>

            {/* Right Column: WhatsApp Order CTA & Beta Price Details (NO coupons, NO donations) */}
            <YStack
              flex={isDesktop ? 1 : undefined}
              width="100%"
              gap={16}
              position={isDesktop ? ('sticky' as any) : undefined}
              top={isDesktop ? 80 : undefined}
            >
              {/* Primary 1-Click WhatsApp Order Handoff Card */}
              <YStack
                backgroundColor="#F0FDF4"
                borderWidth={1.5}
                borderColor="#86EFAC"
                borderRadius={12}
                padding={16}
                gap={10}
              >
                <XStack alignItems="center" gap={8}>
                  <XStack
                    width={32}
                    height={32}
                    borderRadius={16}
                    backgroundColor="#25D366"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <RiWhatsappLine size={20} color="#ffffff" />
                  </XStack>
                  <YStack flex={1}>
                    <Text fontSize={13} fontWeight="800" color="#14532D">
                      Order via WhatsApp
                    </Text>
                    <Text fontSize={10.5} color="#166534">
                      Share your bag directly with our concierge team.
                    </Text>
                  </YStack>
                </XStack>

                <Pressable
                  onPress={handleTriggerWhatsApp}
                  disabled={selectedItems.length === 0}
                  style={
                    ({ pressed }) =>
                      ({
                        backgroundColor: selectedItems.length === 0 ? '#9CA3AF' : '#25D366',
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.9 : 1,
                        cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                      } as any)
                  }
                >
                  <XStack alignItems="center" gap={8}>
                    <RiWhatsappLine size={18} color="#ffffff" />
                    <Text fontSize={13} fontWeight="900" color="#ffffff" letterSpacing={0.5}>
                      SEND CART TO WHATSAPP
                    </Text>
                  </XStack>
                </Pressable>
              </YStack>

              {/* Beta Price Details Card (Clean & Focused) */}
              <YStack
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={12}
                padding={16}
                gap={14}
              >
                <Text fontSize={13} fontWeight="800" color={tokens.text} letterSpacing={0.4}>
                  PRICE DETAILS ({selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'})
                </Text>

                <YStack gap={10} borderBottomWidth={1} borderBottomColor={tokens.border} paddingBottom={12}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={12} color={tokens.textSecondary}>
                      Total MRP
                    </Text>
                    <Text fontSize={12} color={tokens.text}>
                      ₹{totalMRP.toLocaleString('en-IN')}
                    </Text>
                  </XStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={12} color={tokens.textSecondary}>
                      Discount on MRP
                    </Text>
                    <Text fontSize={12} fontWeight="700" color="#16A34A">
                      -₹{totalDiscount.toLocaleString('en-IN')}
                    </Text>
                  </XStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={12} color={tokens.textSecondary}>
                      Delivery Fee
                    </Text>
                    <Text fontSize={12} fontWeight="700" color="#16A34A">
                      FREE
                    </Text>
                  </XStack>
                </YStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={14} fontWeight="900" color={tokens.text}>
                    Total Amount
                  </Text>
                  <Text fontSize={16} fontWeight="900" color={tokens.text}>
                    ₹{finalTotal.toLocaleString('en-IN')}
                  </Text>
                </XStack>

                <Pressable
                  onPress={handleTriggerWhatsApp}
                  disabled={selectedItems.length === 0}
                  style={
                    ({ pressed }) =>
                      ({
                        backgroundColor: selectedItems.length === 0 ? tokens.border : '#25D366',
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        opacity: pressed ? 0.9 : 1,
                        cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                      } as any)
                  }
                >
                  <RiWhatsappLine size={18} color="#ffffff" />
                  <Text fontSize={13} fontWeight="900" color="#ffffff" letterSpacing={0.5}>
                    PLACE ORDER VIA WHATSAPP
                  </Text>
                </Pressable>
              </YStack>

              {/* Security & Assurance Badge */}
              <XStack
                alignItems="center"
                justifyContent="center"
                gap={8}
                paddingVertical={8}
                opacity={0.8}
              >
                <LuShieldCheck size={16} color={tokens.textMuted} />
                <Text fontSize={11} color={tokens.textMuted}>
                  Direct Handloom Sourcing · Concierge Support
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </ScrollView>
      )}

      {/* Mobile Sticky Bottom WhatsApp Order Bar */}
      {isMobile && items.length > 0 && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          paddingHorizontal={16}
          paddingVertical={10}
          gap={8}
          zIndex={50}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -4 }}
          shadowOpacity={0.08}
          shadowRadius={8}
        >
          {/* Top selection notice */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color={tokens.textSecondary}>
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} in bag
            </Text>
            <Text fontSize={14} fontWeight="900" color={tokens.text}>
              ₹{finalTotal.toLocaleString('en-IN')}
            </Text>
          </XStack>

          {/* WhatsApp Primary Order Button */}
          <Pressable
            onPress={handleTriggerWhatsApp}
            disabled={selectedItems.length === 0}
            style={
              ({ pressed }) =>
                ({
                  backgroundColor: selectedItems.length === 0 ? '#9CA3AF' : '#25D366',
                  height: 46,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.92 : 1,
                  cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                } as any)
            }
          >
            <XStack alignItems="center" gap={8}>
              <RiWhatsappLine size={18} color="#ffffff" />
              <Text fontSize={14} fontWeight="900" color="#ffffff" letterSpacing={0.5}>
                ORDER VIA WHATSAPP (₹{finalTotal.toLocaleString('en-IN')})
              </Text>
            </XStack>
          </Pressable>
        </YStack>
      )}
    </YStack>
  );
}
