import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../NavigationContext';
import { useToast } from '../../context/ToastContext';
import { telemetry } from '../../services/telemetry';

export interface CartPageProps {
  onOpenAuth?: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onOpenAuth }) => {
  const { items, itemCount, subtotal, discountTotal, grandTotal, updateQuantity, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { navigate } = useNavigation();
  const { showToast } = useToast();

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'ARTISAN10' || couponCode.toUpperCase() === 'VAYYARI') {
      setCouponApplied(true);
      showToast({ message: 'Coupon applied! Extra 10% artisan patronage discount.', type: 'success' });
    } else {
      showToast({ message: 'Invalid coupon. Try code ARTISAN10', type: 'error' });
    }
  };

  const finalTotal = couponApplied ? Math.round(grandTotal * 0.9) : grandTotal;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛍️</Text>
        <Text style={styles.emptyTitle}>Your Bag is Empty</Text>
        <Text style={styles.emptySub}>Discover authentic handlooms directly from Indian master weavers.</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => navigate('catalog')}>
          <Text style={styles.shopBtnText}>Explore Weaves</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Shopping Bag ({itemCount} {itemCount === 1 ? 'Handloom' : 'Handlooms'})</Text>

      {/* Items list */}
      <View style={styles.itemsList}>
        {items.map((item) => (
          <View key={item.id} style={styles.cartCard}>
            <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
            <View style={styles.itemDetails}>
              <Text style={styles.itemBrand}>{item.brand}</Text>
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
              {item.swatch && (
                <Text style={styles.itemSwatch}>Weave: {item.swatch.name}</Text>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.itemPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                <Text style={styles.itemOrigPrice}>₹{item.originalPrice.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.cardActions}>
                <View style={styles.qtyBox}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Coupon Section */}
      <View style={styles.couponCard}>
        <Text style={styles.couponHeader}>✦ Patron Privilege Code</Text>
        <View style={styles.couponInputRow}>
          <TextInput
            style={styles.couponInput}
            placeholder="Try ARTISAN10"
            placeholderTextColor="#A0AEC0"
            autoCapitalize="characters"
            value={couponCode}
            onChangeText={setCouponCode}
          />
          <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
        {couponApplied && (
          <Text style={styles.appliedMsg}>✓ 10% Extra Patron Discount Applied</Text>
        )}
      </View>

      {/* Bill Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeader}>Price Breakdown</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total MRP</Text>
          <Text style={styles.summaryValue}>₹{(subtotal + discountTotal).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Loom Discount</Text>
          <Text style={styles.discountValue}>−₹{discountTotal.toLocaleString('en-IN')}</Text>
        </View>
        {couponApplied && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Patron Coupon</Text>
            <Text style={styles.discountValue}>−₹{Math.round(grandTotal * 0.1).toLocaleString('en-IN')}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Express Insured Shipping</Text>
          <Text style={styles.freeValue}>FREE</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkoutBtn}
        onPress={() => {
          if (!isAuthenticated) {
            telemetry.trackEvent('checkout_auth_gated', { itemCount: items.length, finalTotal });
            showToast({ message: 'Patron sign in or account registration is required to proceed to checkout.', type: 'info' });
            if (onOpenAuth) {
              onOpenAuth();
            } else {
              navigate('login');
            }
            return;
          }
          telemetry.trackEvent('checkout_initiated', { itemCount: items.length, finalTotal, isAuthenticated: true });
          navigate('checkout');
        }}
        activeOpacity={0.88}
      >
        <Text style={styles.checkoutText}>
          {isAuthenticated ? `Proceed to Checkout • ₹${finalTotal.toLocaleString('en-IN')}` : `Sign In & Checkout • ₹${finalTotal.toLocaleString('en-IN')}`}
        </Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  shopBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  shopBtnText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 16,
  },
  itemsList: {
    gap: 12,
    marginBottom: 20,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemImage: {
    width: 90,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#EDF2F7',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  itemBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9C7A14',
    letterSpacing: 0.8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
    lineHeight: 18,
  },
  itemSwatch: {
    fontSize: 11,
    color: '#718096',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A365D',
  },
  itemOrigPrice: {
    fontSize: 12,
    color: '#A0AEC0',
    textDecorationLine: 'line-through',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A365D',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
    paddingHorizontal: 6,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 11,
    color: '#E53E3E',
    fontWeight: '600',
  },
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  couponHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9C7A14',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
    letterSpacing: 1,
  },
  applyBtn: {
    backgroundColor: '#1A365D',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
  },
  appliedMsg: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  summaryHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#718096',
  },
  summaryValue: {
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '700',
  },
  freeValue: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A365D',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1A365D',
  },
  checkoutBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
});
