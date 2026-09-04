import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput, useTheme, Chip, ActivityIndicator } from 'react-native-paper';
import { delhiveryService, PincodeCheckResult } from '@/services/delhiveryService';
import { ShippingAddressDraft } from '@/types/orders';

interface StructuredAddressFormProps {
  address: ShippingAddressDraft;
  onChangeAddress: (updates: Partial<ShippingAddressDraft>) => void;
}

export const StructuredAddressForm: React.FC<StructuredAddressFormProps> = ({
  address,
  onChangeAddress,
}) => {
  const theme = useTheme();
  const [checkingPin, setCheckingPin] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<PincodeCheckResult | null>(null);

  const handlePincodeChange = async (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    onChangeAddress({ pincode: clean });

    if (clean.length === 6) {
      setCheckingPin(true);
      try {
        const result = await delhiveryService.checkServiceability(clean);
        setPincodeStatus(result);
        onChangeAddress({
          isDelhiveryServiceable: result.isServiceable,
          serviceabilityError: result.errorMessage,
          city: address.city || result.city || '',
          state: address.state || result.state || '',
        });
      } finally {
        setCheckingPin(false);
      }
    } else {
      setPincodeStatus(null);
      onChangeAddress({ isDelhiveryServiceable: null, serviceabilityError: undefined });
    }
  };

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
      <View style={styles.header}>
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
          Structured Shipping Address
        </Text>
        {checkingPin && <ActivityIndicator size={16} color={theme.colors.secondary} />}
      </View>

      <TextInput
        label="Street Address / Flat / Building *"
        value={address.line1}
        onChangeText={val => onChangeAddress({ line1: val })}
        mode="outlined"
        multiline
        numberOfLines={2}
        style={styles.input}
        outlineColor={theme.colors.outlineVariant}
        activeOutlineColor={theme.colors.secondary}
      />

      <View style={styles.row}>
        <TextInput
          label="6-Digit Pincode *"
          value={address.pincode}
          onChangeText={handlePincodeChange}
          keyboardType="number-pad"
          maxLength={6}
          mode="outlined"
          style={[styles.input, { flex: 1 }]}
          outlineColor={theme.colors.outlineVariant}
          activeOutlineColor={theme.colors.secondary}
          right={
            address.pincode.length === 6 && pincodeStatus?.isServiceable ? (
              <TextInput.Icon icon="check-circle" color="#10B981" />
            ) : undefined
          }
        />

        <TextInput
          label="City *"
          value={address.city}
          onChangeText={val => onChangeAddress({ city: val })}
          mode="outlined"
          style={[styles.input, { flex: 1.2 }]}
          outlineColor={theme.colors.outlineVariant}
          activeOutlineColor={theme.colors.secondary}
        />
      </View>

      <TextInput
        label="State / Province *"
        value={address.state}
        onChangeText={val => onChangeAddress({ state: val })}
        mode="outlined"
        style={styles.input}
        outlineColor={theme.colors.outlineVariant}
        activeOutlineColor={theme.colors.secondary}
      />

      {/* Delhivery Pincode Status Badge */}
      {pincodeStatus && (
        <View style={styles.badgeContainer}>
          {pincodeStatus.isServiceable ? (
            <Chip
              icon="truck-fast"
              compact
              style={{ backgroundColor: '#ECFDF5' }}
              textStyle={{ color: '#065F46', fontSize: 11, fontWeight: '600' }}
            >
              Delhivery Serviceable (COD & Prepaid)
            </Chip>
          ) : (
            <Chip
              icon="alert-circle"
              compact
              style={{ backgroundColor: '#FEF2F2' }}
              textStyle={{ color: '#991B1B', fontSize: 11, fontWeight: '600' }}
            >
              {pincodeStatus.errorMessage || 'Delhivery Delivery Restricted'}
            </Chip>
          )}
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
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
  badgeContainer: {
    marginTop: 2,
    flexDirection: 'row',
  },
});
