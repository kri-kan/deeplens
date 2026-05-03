import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { BentoCard } from '@/components/ui/BentoCard';
import { PlatformHandle } from '@/components/ui/PlatformHandle';
import { CompactChip } from '@/components/ui/CompactChip';
import { Customer } from '@/types/customers';

interface CustomerTileProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
  tileSize: number;
}

export const CustomerTile: React.FC<CustomerTileProps> = ({ customer, onPress, tileSize }) => {
  const theme = useTheme();
  
  const colors = ['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];
  const avatarColor = colors[customer.id.length % colors.length] || colors[0];
  const displayName = (customer.firstName || customer.lastName) 
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() 
    : 'Unknown Customer';

  const getAvatarLabel = (customer: Customer) => {
    const first = customer.firstName?.trim() || '';
    const last = customer.lastName?.trim() || '';
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (last) return last[0].toUpperCase();
    return '?';
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={{ width: tileSize, marginBottom: 12 }}
      onPress={() => onPress(customer)}
    >
      <BentoCard surfaceLevel="surfaceContainerLow" style={styles.card}>
        <View style={styles.header}>
          <Avatar.Text 
            size={40} 
            label={getAvatarLabel(customer)} 
            style={{ backgroundColor: avatarColor }} 
          />
          <View style={styles.nameContainer}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={2}>{displayName}</Text>
          </View>
        </View>
        
        <View style={styles.info}>
          {customer.phoneNumber && (
             <PlatformHandle 
                source="whatsapp" 
                handle={customer.phoneNumber} 
                fontSize={12} 
                size={20}
                color={theme.colors.onSurfaceVariant}
             />
          )}
          {customer.instagramId && (
             <PlatformHandle 
                source="instagram" 
                handle={customer.instagramId} 
                fontSize={12} 
                size={20}
                color={theme.colors.onSurfaceVariant}
             />
          )}
        </View>

        <View style={styles.footer}>
           <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
             {customer.addresses?.length || 0} Addr.
           </Text>
            <CompactChip 
              outline 
              color={theme.colors.outline}
              textStyle={{ fontSize: 9 }}
            >
              {`#${customer.customerId}`}
            </CompactChip>
        </View>
      </BentoCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 20,
    height: 150,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 20,
  },
  info: {
    flex: 1,
    marginTop: 8,
    gap: 2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#999',
  },
});
