import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, IconButton, Button, Modal, Divider, List, Card, Switch, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { Customer } from '@/types/customers';
import { WhatsAppChannel, CustomerChannelMembership } from '@/services/whatsappService';

interface CustomerDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  customer: Customer | null;
  onAddAddress: () => void;
  allChannels: WhatsAppChannel[];
  memberships: CustomerChannelMembership[];
  channelLoading: boolean;
  onToggleSubscription: (channelId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  visible,
  onDismiss,
  customer,
  onAddAddress,
  allChannels,
  memberships,
  channelLoading,
  onToggleSubscription,
}) => {
  const theme = useTheme();

  if (!customer) return null;

  const getAvatarLabel = (customer: Customer) => {
    const first = customer.firstName?.trim() || '';
    const last = customer.lastName?.trim() || '';
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (last) return last[0].toUpperCase();
    return '?';
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
           <Avatar.Text 
              size={64} 
              label={getAvatarLabel(customer)} 
              style={{ backgroundColor: theme.colors.primaryContainer }} 
           />
           <View style={styles.meta}>
              <Text variant="headlineSmall" style={styles.name}>
                {customer.firstName || customer.lastName ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown'}
              </Text>
              {customer.phoneNumber && <Text variant="bodyMedium">{customer.phoneNumber}</Text>}
              {customer.email && <Text variant="bodySmall" style={{ opacity: 0.7 }}>{customer.email}</Text>}
              {customer.referralCode && (
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <Chip 
                    icon="ticket-percent" 
                    style={{ backgroundColor: '#E8F5E9', height: 28, justifyContent: 'center', borderRadius: 8 }}
                    textStyle={{ color: '#2E7D32', fontSize: 11, fontWeight: 'bold' }}
                  >
                    REF: {customer.referralCode}
                  </Chip>
                </View>
              )}
           </View>
        </View>

        {customer.instagramAccounts && customer.instagramAccounts.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={[styles.bold, { marginBottom: 8 }]}>Instagram Accounts</Text>
            <View style={styles.handlesContainer}>
              {customer.instagramAccounts.map((acc) => (
                <View key={acc.id} style={styles.instagramChip}>
                  <IconButton
                    icon={acc.isPrimary ? 'star' : 'star-outline'}
                    iconColor={acc.isPrimary ? '#FFD700' : 'rgba(0,0,0,0.3)'}
                    size={16}
                    style={{ margin: 0 }}
                  />
                  <Text style={styles.chipText}>@{acc.username}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {customer.preferredLanguages && customer.preferredLanguages.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={[styles.bold, { marginBottom: 8 }]}>Preferred Languages</Text>
            <View style={styles.chipContainer}>
              {customer.preferredLanguages.map((code) => {
                const friendlyNames: Record<string, string> = {
                  'en-in': 'English',
                  'te-in': 'Telugu',
                  'hi-in': 'Hindi',
                  'ta-in': 'Tamil',
                  'ml-in': 'Malayalam',
                  'kn-in': 'Kannada',
                  'en-te': 'English & Telugu'
                };
                return (
                  <Chip key={code} style={styles.languageChip} compact>
                    {friendlyNames[code] || code}
                  </Chip>
                );
              })}
            </View>
          </>
        )}

        <Divider style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.bold}>Addresses</Text>
          <Button icon="plus" mode="text" onPress={onAddAddress}>Add</Button>
        </View>

        {customer.addresses && customer.addresses.length > 0 ? (
          customer.addresses.map((addr) => (
            <Card key={addr.id} style={styles.addressCard} mode="outlined">
              <Card.Content>
                <View style={styles.addressTitleRow}>
                  <Text variant="titleSmall" style={styles.bold}>{addr.name}</Text>
                  {addr.isDefault && <Text variant="labelSmall" style={{ color: theme.colors.primary }}>DEFAULT</Text>}
                </View>
                <Text variant="bodySmall">{addr.phone}</Text>
                <Text variant="bodySmall">{addr.line1}</Text>
                {addr.line2 && <Text variant="bodySmall">{addr.line2}</Text>}
                <Text variant="bodySmall">{addr.city}, {addr.state} - {addr.pincode}</Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.empty}>
             <Text variant="bodySmall" style={{ opacity: 0.5 }}>No addresses added yet.</Text>
          </View>
        )}

        <Divider style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.bold}>WhatsApp Broadcasts</Text>
        </View>

        {channelLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
        ) : (
          allChannels.map(channel => {
            const membership = memberships.find(m => m.channelId === channel.id);
            const isSubscribed = membership?.status === 'OPTED_IN';
            
            return (
              <List.Item
                key={channel.id}
                title={channel.name}
                description={channel.description}
                left={props => <List.Icon {...props} icon="whatsapp" color={isSubscribed ? '#25D366' : theme.colors.outline} />}
                right={props => (
                  <Switch 
                    value={isSubscribed} 
                    onValueChange={() => onToggleSubscription(channel.id)} 
                    color="#25D366"
                  />
                )}
                style={styles.listItem}
              />
            );
          })
        )}

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>Close</Button>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  handlesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  instagramChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingRight: 10,
    height: 32,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    backgroundColor: '#EAEAEA',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  addressCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  addressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
    padding: 16,
    alignItems: 'center',
  },
  loader: {
    marginVertical: 16,
  },
  listItem: {
    paddingLeft: 0,
  },
  actions: {
    marginTop: 24,
  },
  closeButton: {
    borderRadius: 8,
  },
});
