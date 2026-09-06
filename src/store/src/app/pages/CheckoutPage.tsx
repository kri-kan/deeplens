import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useNavigation } from '../NavigationContext';
import { useToast } from '../../context/ToastContext';
import { telemetry } from '../../services/telemetry';

export interface CheckoutPageProps {
  onOpenAuth?: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onOpenAuth }) => {
  const { items, grandTotal, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { currentLocation } = usePermissions();
  const { navigate } = useNavigation();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handlePlaceOrder = () => {
    telemetry.trackEvent('order_placed', {
      orderId: `VY-${Date.now().toString().slice(-6)}`,
      amount: grandTotal,
      paymentMethod,
      itemCount: items.length,
      patronPhone: user?.phone,
    });
    setOrderPlaced(true);
  };

  const handleOrderSuccessDone = () => {
    setOrderPlaced(false);
    clearCart();
    showToast({ message: 'Artisan order placed successfully!', type: 'success' });
    navigate('home');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authGateContainer}>
        <View style={styles.authGateCard}>
          <Text style={styles.authGateIcon}>🔐</Text>
          <Text style={styles.authGateTitle}>Patron Account Required</Text>
          <Text style={styles.authGateSubtitle}>
            Guest checkout is not permitted for verified handloom dispatches. Please sign in or register to verify your shipping destination and place your order.
          </Text>
          <TouchableOpacity
            style={styles.authGateBtn}
            onPress={() => (onOpenAuth ? onOpenAuth() : navigate('login'))}
            activeOpacity={0.88}
          >
            <Text style={styles.authGateBtnText}>LOGIN / SIGNUP TO PROCEED</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backToCartBtn}
            onPress={() => navigate('cart')}
            activeOpacity={0.8}
          >
            <Text style={styles.backToCartText}>← Return to Shopping Bag</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Secure Checkout</Text>

      {/* Shipping address card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Verified Delivery Address</Text>
        <Text style={styles.addressName}>Artisan Patron Home</Text>
        <Text style={styles.addressLine}>Plot 42, Jubilee Hills Road No. 36</Text>
        <Text style={styles.addressCity}>{currentLocation?.city || 'Hyderabad'}, {currentLocation?.state || 'Telangana'} — {currentLocation?.pincode || '500081'}</Text>
        <Text style={styles.dispatchPill}>✦ Handloom dispatched in sealed tamper-proof luxury packaging</Text>
      </View>

      {/* Payment methods */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Method</Text>

        <TouchableOpacity
          style={[styles.payOption, paymentMethod === 'upi' && styles.payOptionActive]}
          onPress={() => setPaymentMethod('upi')}
        >
          <Text style={styles.payIcon}>📱</Text>
          <View style={styles.payInfo}>
            <Text style={styles.payTitle}>Instant UPI (Google Pay, PhonePe, Paytm)</Text>
            <Text style={styles.paySub}>Zero transaction fees • Instant verification</Text>
          </View>
          <View style={[styles.radioCircle, paymentMethod === 'upi' && styles.radioCircleActive]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payOption, paymentMethod === 'card' && styles.payOptionActive]}
          onPress={() => setPaymentMethod('card')}
        >
          <Text style={styles.payIcon}>💳</Text>
          <View style={styles.payInfo}>
            <Text style={styles.payTitle}>Credit / Debit Card</Text>
            <Text style={styles.paySub}>Visa, MasterCard, RuPay, Amex</Text>
          </View>
          <View style={[styles.radioCircle, paymentMethod === 'card' && styles.radioCircleActive]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payOption, paymentMethod === 'cod' && styles.payOptionActive]}
          onPress={() => setPaymentMethod('cod')}
        >
          <Text style={styles.payIcon}>💵</Text>
          <View style={styles.payInfo}>
            <Text style={styles.payTitle}>Cash on Delivery</Text>
            <Text style={styles.paySub}>Pay upon delivery & inspection</Text>
          </View>
          <View style={[styles.radioCircle, paymentMethod === 'cod' && styles.radioCircleActive]} />
        </TouchableOpacity>
      </View>

      {/* Order preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Summary ({items.length} items)</Text>
        {items.map((it) => (
          <View key={it.id} style={styles.summaryItemRow}>
            <Text style={styles.summaryItemTitle} numberOfLines={1}>{it.title} (x{it.quantity})</Text>
            <Text style={styles.summaryItemPrice}>₹{(it.price * it.quantity).toLocaleString('en-IN')}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.summaryItemRow}>
          <Text style={styles.totalText}>Amount Payable</Text>
          <Text style={styles.totalPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder} activeOpacity={0.88}>
        <Text style={styles.placeOrderText}>Place Handloom Order • ₹{grandTotal.toLocaleString('en-IN')}</Text>
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal visible={orderPlaced} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalSuccessIcon}>✦</Text>
            <Text style={styles.modalTitle}>Order Confirmed!</Text>
            <Text style={styles.modalSub}>
              Your heirloom handloom order has been routed directly to our certified master weavers.
            </Text>
            <View style={styles.orderIdBadge}>
              <Text style={styles.orderIdText}>Order ID: VY-2026-{Math.floor(100000 + Math.random() * 900000)}</Text>
            </View>
            <Text style={styles.modalNote}>
              You will receive real-time loom dispatch notifications and courier tracking updates via SMS & Email.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleOrderSuccessDone}>
              <Text style={styles.modalBtnText}>Return to Storefront</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A365D',
    marginBottom: 12,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 13,
    color: '#4A5568',
  },
  addressCity: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 10,
  },
  dispatchPill: {
    color: '#9C7A14',
    fontSize: 11,
    fontWeight: '700',
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  payOptionActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#FAF7F0',
  },
  payIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  payInfo: {
    flex: 1,
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
  },
  paySub: {
    fontSize: 11,
    color: '#718096',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
  },
  radioCircleActive: {
    borderColor: '#1A365D',
    backgroundColor: '#1A365D',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryItemTitle: {
    fontSize: 12,
    color: '#4A5568',
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A365D',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A365D',
  },
  placeOrderBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  modalSuccessIcon: {
    fontSize: 36,
    color: '#D4AF37',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  orderIdBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A365D',
  },
  modalNote: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  modalBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
  authGateContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 400,
  },
  authGateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    maxWidth: 440,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    gap: 12,
  },
  authGateIcon: {
    fontSize: 42,
    marginBottom: 4,
  },
  authGateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A365D',
    textAlign: 'center',
  },
  authGateSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  authGateBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  authGateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backToCartBtn: {
    paddingVertical: 8,
  },
  backToCartText: {
    fontSize: 12,
    color: '#1A365D',
    fontWeight: '700',
  },
});
