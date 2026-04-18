import React from 'react';
import { View } from 'react-native';
import { Surface, Text, Icon, IconButton, useTheme } from 'react-native-paper';
import { OrderIdEntry } from '@/types/orders';
import { ProfileCopyIcon } from '../../icons/ProfileCopyIcon';

interface GeneratedIdCardProps {
  entry: OrderIdEntry | null;
  isNew: boolean;
  onCopy: (id: string, includePrefix?: boolean) => void;
  formatTimeAgo: (timestamp: string) => string;
  styles: any;
}

export const GeneratedIdCard = ({ 
  entry, 
  isNew, 
  onCopy, 
  formatTimeAgo, 
  styles 
}: GeneratedIdCardProps) => {
  const theme = useTheme();

  if (!entry) return null;

  return (
    <Surface style={[styles.idCard, !isNew && styles.idCardInactive]} elevation={1}>
      <View style={styles.idCardLeft}>
        <Icon 
          source={entry.source === 'whatsapp' ? 'whatsapp' : 'instagram'} 
          size={24} 
          color={entry.source === 'whatsapp' ? '#25D366' : '#E4405F'} 
        />
        <View>
          <Text style={styles.idCardText}>{entry.id}</Text>
          <Text style={styles.timestampText}>
            {isNew ? 'Generated just now' : formatTimeAgo(entry.timestamp)}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <IconButton 
          icon="content-copy" 
          size={22} 
          onPress={() => onCopy(entry.id)}
          iconColor={isNew ? theme.colors.primary : theme.colors.outline}
          style={{ marginRight: 10 }}
        />
        <IconButton 
          icon={props => <ProfileCopyIcon {...props} />} 
          size={22} 
          onPress={() => onCopy(entry.id, true)}
          iconColor={isNew ? theme.colors.primary : theme.colors.outline}
          style={{ marginRight: 10 }}
        />
      </View>
    </Surface>
  );
};
