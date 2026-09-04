import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput, SegmentedButtons, useTheme, Divider, Chip } from 'react-native-paper';
import { OrderSource, PaymentMode } from '@/types/orders';

interface FinancialsSummaryCardProps {
  source: OrderSource;
  onSourceChange: (source: OrderSource) => void;
  sourceHandle: string;
  onSourceHandleChange: (handle: string) => void;
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  itemsTotal: number;
  shippingCharges: number;
  onShippingChargesChange: (val: number) => void;
  advancePaid: number;
  onAdvancePaidChange: (val: number) => void;
  totalAmount: number;
  codBalance: number;
}

export const FinancialsSummaryCard: React.FC<FinancialsSummaryCardProps> = ({
  source,
  onSourceChange,
  sourceHandle,
  onSourceHandleChange,
  paymentMode,
  onPaymentModeChange,
  itemsTotal,
  shippingCharges,
  onShippingChargesChange,
  advancePaid,
  onAdvancePaidChange,
  totalAmount,
  codBalance,
}) => {
  const theme = useTheme();

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      elevation={1}
    >
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        Order Source & Financials
      </Text>

      {/* Order Source Segment */}
      <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.onSurfaceVariant }}>
        Order Origin Platform:
      </Text>
      <SegmentedButtons
        value={source}
        onValueChange={val => onSourceChange(val as OrderSource)}
        buttons={[
          {
            value: 'WhatsApp',
            label: 'WhatsApp',
            icon: 'whatsapp',
          },
          {
            value: 'Instagram',
            label: 'Instagram',
            icon: 'instagram',
          },
        ]}
      />

      <TextInput
        label={source === 'WhatsApp' ? 'WhatsApp Phone Number *' : 'Instagram Handle / Post Link *'}
        value={sourceHandle}
        onChangeText={onSourceHandleChange}
        mode="outlined"
        placeholder={source === 'WhatsApp' ? '+91 98765 43210' : '@customer_handle or post URL'}
        left={<TextInput.Icon icon={source === 'WhatsApp' ? 'phone' : 'instagram'} />}
        style={styles.input}
        outlineColor={theme.colors.outlineVariant}
        activeOutlineColor={theme.colors.secondary}
      />

      <Divider style={{ marginVertical: 4 }} />

      {/* Payment Mode Selector */}
      <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.onSurfaceVariant }}>
        Payment Mode:
      </Text>
      <SegmentedButtons
        value={paymentMode}
        onValueChange={val => onPaymentModeChange(val as PaymentMode)}
        buttons={[
          {
            value: 'COD',
            label: 'COD (Cash on Delivery)',
            icon: 'cash-sync',
          },
          {
            value: 'Prepaid',
            label: 'Prepaid (Full Advance)',
            icon: 'credit-card-check',
          },
        ]}
      />

      {/* Financial Inputs */}
      <View style={styles.row}>
        <TextInput
          label="Shipping Fee (₹)"
          value={shippingCharges > 0 ? String(shippingCharges) : '0'}
          onChangeText={val => onShippingChargesChange(parseFloat(val) || 0)}
          keyboardType="numeric"
          mode="outlined"
          style={[styles.input, { flex: 1 }]}
          outlineColor={theme.colors.outlineVariant}
          activeOutlineColor={theme.colors.secondary}
        />

        {paymentMode === 'COD' && (
          <TextInput
            label="Advance Paid (₹)"
            value={advancePaid > 0 ? String(advancePaid) : ''}
            onChangeText={val => onAdvancePaidChange(parseFloat(val) || 0)}
            keyboardType="numeric"
            mode="outlined"
            style={[styles.input, { flex: 1 }]}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.secondary}
          />
        )}
      </View>

      {/* Ledger Calculation Breakdown */}
      <Surface style={[styles.ledgerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.ledgerRow}>
          <Text variant="bodyMedium">Items Total:</Text>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>₹{itemsTotal}</Text>
        </View>
        <View style={styles.ledgerRow}>
          <Text variant="bodyMedium">Shipping Fee:</Text>
          <Text variant="bodyMedium">₹{shippingCharges}</Text>
        </View>
        <Divider style={{ marginVertical: 4 }} />
        <View style={styles.ledgerRow}>
          <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Total Payable Amount:</Text>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>₹{totalAmount}</Text>
        </View>

        {paymentMode === 'COD' ? (
          <>
            <View style={styles.ledgerRow}>
              <Text variant="bodySmall" style={{ color: '#059669' }}>Advance Collected:</Text>
              <Text variant="bodySmall" style={{ fontWeight: 'bold', color: '#059669' }}>- ₹{advancePaid}</Text>
            </View>
            <View style={[styles.ledgerRow, styles.codHighlight]}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#B91C1C' }}>Pending COD Balance:</Text>
              <Chip compact textStyle={{ fontSize: 12, fontWeight: 'bold', color: '#B91C1C' }} style={{ backgroundColor: '#FEE2E2' }}>
                ₹{codBalance}
              </Chip>
            </View>
          </>
        ) : (
          <View style={styles.ledgerRow}>
            <Text variant="bodySmall" style={{ color: '#059669' }}>Prepaid Settlement:</Text>
            <Chip compact textStyle={{ fontSize: 11, fontWeight: 'bold', color: '#059669' }} style={{ backgroundColor: '#D1FAE5' }}>
              ₹{totalAmount} Paid in Full
            </Chip>
          </View>
        )}
      </Surface>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  ledgerCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codHighlight: {
    paddingTop: 4,
  },
});
