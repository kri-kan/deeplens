import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../app/NavigationContext';
import { telemetry } from '../../services/telemetry';

export interface CartDrawerProps {
  onOpenAuth?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenAuth }) => {
  const { isDrawerOpen, closeDrawer, items, itemCount, grandTotal, updateQuantity, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { navigate } = useNavigation();

  if (!isDrawerOpen) return null;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      telemetry.trackEvent('checkout_auth_gated', { itemCount, grandTotal });
      closeDrawer();
      if (onOpenAuth) {
        onOpenAuth();
      } else {
        navigate('login');
      }
      return;
    }

    telemetry.trackEvent('checkout_initiated', { itemCount, grandTotal, isAuthenticated: true });
    closeDrawer();
    navigate('checkout');
  };

  const handleViewBag = () => {
    closeDrawer();
    navigate('cart');
  };

  return (
    <Modal visible={isDrawerOpen} transparent animationType="fade" onRequestClose={closeDrawer}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeDrawer} />
        <View style={styles.drawer}>
          <View style={styles.header}>
            <Text style={styles.title}>Shopping Bag ({itemCount})</Text>
            <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyView}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyText}>Your bag is empty</Text>
            </View>
          ) : (
            <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
              {items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <Image source={{ uri: it.image }} style={styles.itemImg} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{it.title}</Text>
                    {it.swatch && <Text style={styles.itemSwatch}>Weave: {it.swatch.name}</Text>}
                    <Text style={styles.itemPrice}>₹{it.price.toLocaleString('en-IN')}</Text>

                    <View style={styles.itemActions}>
                      <View style={styles.qtyBox}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(it.id, it.quantity - 1)}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{it.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(it.id, it.quantity + 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => removeItem(it.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {items.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
              </View>
              <TouchableOpacity style={styles.viewBagBtn} onPress={handleViewBag}>
                <Text style={styles.viewBagText}>View Full Bag</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                <Text style={styles.checkoutText}>Checkout • ₹{grandTotal.toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: '#FAF7F2',
    height: '100%',
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: '#718096',
  },
  emptyView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#718096',
  },
  itemList: {
    flex: 1,
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemImg: {
    width: 60,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A365D',
  },
  itemSwatch: {
    fontSize: 10,
    color: '#718096',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A365D',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A365D',
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A365D',
    paddingHorizontal: 4,
  },
  removeText: {
    fontSize: 10,
    color: '#E53E3E',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A365D',
  },
  viewBagBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A365D',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewBagText: {
    color: '#1A365D',
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#FAF7F2',
    fontSize: 13,
    fontWeight: '700',
  },
});
