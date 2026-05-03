import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, IconButton, Divider, useTheme } from 'react-native-paper';
import { BentoCard } from '@/components/ui/BentoCard';
import { WhatsAppChannel } from '@/services/whatsappService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

interface ChannelCardProps {
  channel: WhatsAppChannel;
  onPress: (channel: WhatsAppChannel) => void;
  onDelete: (channel: WhatsAppChannel) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onPress, onDelete }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity onPress={() => onPress(channel)} onLongPress={() => onDelete(channel)}>
      <BentoCard surfaceLevel="surfaceContainerLow" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconButton icon="whatsapp" iconColor="#25D366" size={28} />
          </View>
          <IconButton icon="dots-vertical" size={20} onPress={() => onDelete(channel)} />
        </View>
        <View style={styles.body}>
          <Text variant="titleMedium" style={styles.name}>{channel.name}</Text>
          {channel.description && (
            <Text variant="bodySmall" numberOfLines={2} style={styles.desc}>
              {channel.description}
            </Text>
          )}
        </View>
        <Divider style={styles.divider} />
        <View style={styles.footer}>
           <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Tap to view subscribers</Text>
        </View>
      </BentoCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    padding: 12,
    borderRadius: 24,
    height: 180,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderRadius: 12,
  },
  body: {
    flex: 1,
    marginTop: 8,
  },
  name: {
    fontWeight: 'bold',
  },
  desc: {
    opacity: 0.6,
    marginTop: 4,
  },
  divider: {
    marginVertical: 8, 
    opacity: 0.1,
  },
  footer: {
    marginTop: 4,
  },
});
