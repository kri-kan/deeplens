import React, { useState } from 'react';
import { StyleSheet, View, Modal, ScrollView, Linking, Image } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme, TextInput, Divider, Chip } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { FulfillmentPackage, LogisticsOrder } from '@/types/logistics';

interface VendorWhatsAppShareModalProps {
  visible: boolean;
  onDismiss: () => void;
  order: LogisticsOrder;
  packageItem: FulfillmentPackage;
}

export const VendorWhatsAppShareModal: React.FC<VendorWhatsAppShareModalProps> = ({
  visible,
  onDismiss,
  order,
  packageItem,
}) => {
  const theme = useTheme();

  const isDirectVendor = packageItem.fulfillmentPath === 'DirectVendor';
  const vendorPhone = packageItem.vendorPhone || '+919825012345';
  const cleanPhone = vendorPhone.replace(/[^0-9]/g, '');

  const buildManifestText = () => {
    let msg = `*VAYYARI PO / DISPATCH REQUEST*\n`;
    msg += `--------------------------------\n`;
    msg += `*Order ID:* ${order.orderNumber}\n`;
    msg += `*Package:* #${packageItem.packageNumber} of ${order.packages.length}\n`;
    msg += `*Vendor:* ${packageItem.vendorName}\n`;
    msg += `*Fulfillment Path:* ${isDirectVendor ? 'Direct Drop-Ship to Customer' : 'Ship to Central Hub (Bengaluru)'}\n\n`;

    msg += `*ITEMS TO DISPATCH (${packageItem.items.length}):*\n`;
    packageItem.items.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.productName}*\n   • SKU: ${it.sku || 'N/A'}\n   • Qty: ${it.quantity} pc(s)\n   • Value: ₹${it.totalPrice}\n`;
    });

    msg += `\n*TOTAL PACKAGE VALUE:* ₹${packageItem.packageValue}\n`;

    if (isDirectVendor) {
      msg += `\n*SHIPPING DESTINATION (CUSTOMER):*\n`;
      msg += `Name: ${order.customerName}\n`;
      msg += `Phone: ${order.customerPhone}\n`;
      msg += `Address: ${order.shippingAddress}\n`;
      msg += `City/State: ${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}\n`;
      if (order.paymentMode === 'COD') {
        msg += `*PAYMENT:* Collect COD of ₹${packageItem.codAmount}\n`;
      } else {
        msg += `*PAYMENT:* PREPAID (Do not collect cash)\n`;
      }
      msg += `\n*ACTION REQUIRED:* Please attach courier AWB & tracking slip once packed.`;
    } else {
      msg += `\n*SHIPPING DESTINATION (CENTRAL HUB):*\n`;
      msg += `Vayyari Central Logistics Hub\n`;
      msg += `Plot 88, Electronic City Phase 1, Hosur Road\n`;
      msg += `Bengaluru, Karnataka - 560100\n`;
      msg += `Contact: +91 80 4912 0000\n`;
      msg += `\n*ACTION REQUIRED:* Please dispatch via fast courier and share inbound AWB.`;
    }

    return msg;
  };

  const [message, setMessage] = useState(buildManifestText());
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    Linking.openURL(url).catch(() => {
      // Fallback open generic whatsapp
      Linking.openURL(`https://api.whatsapp.com/send?text=${encoded}`);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface
          style={[
            styles.sheet,
            {
              backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={5}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconButton icon="whatsapp" size={26} iconColor="#25D366" style={styles.headerIcon} />
              <View>
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  Share Order with Vendor
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {packageItem.vendorName} ({vendorPhone})
                </Text>
              </View>
            </View>
            <IconButton icon="close" size={22} onPress={onDismiss} />
          </View>

          {/* Mode Pill */}
          <View style={styles.pathPillContainer}>
            <Chip
              icon={isDirectVendor ? 'truck-fast-outline' : 'warehouse'}
              style={{ backgroundColor: isDirectVendor ? '#e8f5e9' : '#e3f2fd' }}
              textStyle={{ color: isDirectVendor ? '#1b5e20' : '#0d47a1', fontWeight: 'bold' }}
            >
              {isDirectVendor ? 'Path A: Direct Drop-Ship to Customer' : 'Path B: Inbound to Central Hub'}
            </Chip>
          </View>

          {/* Item Thumbnails Row */}
          {packageItem.items.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbsScroll}>
              {packageItem.items.map((it, idx) => (
                <View key={it.id || idx} style={styles.thumbCard}>
                  {it.photoUrl ? (
                    <Image source={{ uri: it.photoUrl }} style={styles.thumbImg} />
                  ) : (
                    <Surface style={styles.thumbPlaceholder}>
                      <IconButton icon="tshirt-crew" size={20} />
                    </Surface>
                  )}
                  <Text numberOfLines={1} style={styles.thumbName}>
                    {it.productName}
                  </Text>
                  <Text style={styles.thumbQty}>Qty: {it.quantity}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Message Content Preview */}
          <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            Pre-formatted WhatsApp Message:
          </Text>

          <TextInput
            mode="outlined"
            multiline
            numberOfLines={9}
            value={message}
            onChangeText={setMessage}
            style={styles.messageInput}
          />

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Button
              mode="outlined"
              icon={copied ? 'check' : 'content-copy'}
              onPress={handleCopy}
              style={styles.actionBtn}
            >
              {copied ? 'Copied!' : 'Copy Text'}
            </Button>
            <Button
              mode="contained"
              icon="whatsapp"
              buttonColor="#25D366"
              textColor="#ffffff"
              onPress={handleOpenWhatsApp}
              style={styles.actionBtn}
            >
              Open WhatsApp
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    margin: 0,
  },
  title: {
    fontWeight: 'bold',
  },
  pathPillContainer: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  thumbsScroll: {
    maxHeight: 90,
    marginBottom: 10,
  },
  thumbCard: {
    width: 75,
    marginRight: 10,
    alignItems: 'center',
  },
  thumbImg: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  thumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
  },
  thumbName: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  thumbQty: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
  },
  sectionLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  messageInput: {
    maxHeight: 180,
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
  },
});
