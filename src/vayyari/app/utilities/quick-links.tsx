import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Linking, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Surface, Appbar, List, Text, useTheme, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { BentoCard } from '@/components/ui/BentoCard';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4;
const GAP = 0;
const CONTAINER_PADDING = 0;
const TILE_SIZE = width / COLUMN_COUNT;

interface QuickLink {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  url: string;
  color: string;
  info?: string;
}

// Local assets mapping for courier logos
const COURIER_LOGOS: { [key: string]: any } = {
  'dtdc-tracking': require('@/assets/images/couriers/dtdc.png'),
  'india-post-tracking': require('@/assets/images/couriers/india-post.png'),
  'bluedart-tracking': require('@/assets/images/couriers/bluedart.png'),
  'shree-maruti-tracking': require('@/assets/images/couriers/shree-maruti.png'),
  'delhivery-tracking': require('@/assets/images/couriers/delhivery.png'),
};

export default function QuickLinksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [selectedInfo, setSelectedInfo] = useState<QuickLink | null>(null);

  const COURIER_LINKS: QuickLink[] = [
    {
      id: 'dtdc-tracking',
      title: 'DTDC',
      url: 'https://www.dtdc.com/track-your-shipment/',
      color: '#004791'
    },
    {
      id: 'india-post-tracking',
      title: 'India Post',
      url: 'https://www.indiapost.gov.in/',
      color: '#DA251C'
    },
    {
      id: 'bluedart-tracking',
      title: 'Blue Dart',
      url: 'https://bluedart.com/tracking',
      color: '#004DAE'
    },
    {
      id: 'shree-maruti-tracking',
      title: 'Shree Maruti',
      url: 'https://shreemaruti.com/track-shipment/',
      color: '#F26522'
    },
    {
      id: 'delhivery-tracking',
      title: 'Delhivery',
      url: 'https://www.delhivery.com/tracking',
      color: '#1a1a1a'
    }
  ];

  const UTILITY_LINKS: QuickLink[] = [
    {
      id: 'fb-graph-explorer',
      title: 'Facebook Graph API Explorer',
      description: 'Generate short-lived user access tokens to be exchanged for long-lived tokens.',
      icon: 'facebook',
      url: 'https://developers.facebook.com/tools/explorer/',
      color: '#1877F2',
      info: `Required User Permissions before attaching token:\n\n` +
            `• manage_fundraisers\n` +
            `• read_insights\n` +
            `• publish_video\n` +
            `• catalog_management\n` +
            `• private_computation_access\n` +
            `• threads_business_basic\n` +
            `• marketing_messages_messenger\n` +
            `• pages_manage_cta\n` +
            `• pages_manage_instant_articles\n` +
            `• pages_show_list\n` +
            `• read_page_mailboxes\n` +
            `• ads_management\n` +
            `• ads_read\n` +
            `• business_management\n` +
            `• pages_messaging\n` +
            `• pages_messaging_phone_number\n` +
            `• pages_messaging_subscriptions\n` +
            `• instagram_basic\n` +
            `• instagram_manage_comments\n` +
            `• instagram_manage_insights\n` +
            `• instagram_content_publish\n` +
            `• leads_retrieval\n` +
            `• instagram_manage_messages\n` +
            `• page_events\n` +
            `• pages_read_engagement\n` +
            `• pages_manage_metadata\n` +
            `• pages_read_user_content\n` +
            `• pages_manage_ads\n` +
            `• pages_manage_posts\n` +
            `• pages_manage_engagement\n` +
            `• instagram_shopping_tag_products\n` +
            `• instagram_branded_content_brand\n` +
            `• instagram_branded_content_creator\n` +
            `• instagram_branded_content_ads_brand\n` +
            `• instagram_manage_events\n` +
            `• instagram_manage_upcoming_events\n` +
            `• manage_app_solution\n` +
            `• pages_utility_messaging\n` +
            `• paid_marketing_messages\n` +
            `• instagram_creator_marketplace_discovery\n` +
            `• facebook_creator_marketplace_discovery\n` +
            `• instagram_manage_contents\n` +
            `• facebook_branded_content_ads_brand\n` +
            `• instagram_manage_engagement`
    }
  ];

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Don't know how to open URI: " + url);
      }
    } catch (error) {
      console.error('An error occurred', error);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Quick Links" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Courier Tracking</Text>
          <Text variant="bodySmall" style={styles.helperText}>Quickly track your shipments across major couriers.</Text>
        </View>

        <View style={styles.grid}>
          {COURIER_LINKS.map((link) => (
            <TouchableOpacity 
              key={link.id} 
              onPress={() => handleOpenLink(link.url)}
              activeOpacity={0.7}
              style={{ width: TILE_SIZE, height: TILE_SIZE }}
            >
              <BentoCard 
                style={[styles.tile, { borderRadius: 0 }]}
                surfaceLevel="surfaceContainerLow"
              >
                <View style={styles.tileContent}>
                  <Image 
                    source={COURIER_LOGOS[link.id]} 
                    style={styles.logo} 
                    resizeMode="contain" 
                  />
                  <Text variant="labelSmall" style={styles.tileTitle} numberOfLines={1}>
                    {link.title}
                  </Text>
                </View>
              </BentoCard>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Utilities & Tools</Text>
          <Text variant="bodySmall" style={styles.helperText}>External resources for application management.</Text>
        </View>

        <Surface style={styles.utilityCard} elevation={1}>
          {UTILITY_LINKS.map((link, index) => (
            <React.Fragment key={link.id}>
              <List.Item
                title={link.title}
                description={link.description}
                descriptionNumberOfLines={2}
                left={props => <List.Icon {...props} icon={link.icon || 'link'} color={link.color} />}
                right={props => (
                  <View style={styles.rightActions}>
                    {link.info && (
                      <IconButton 
                        icon="information-outline" 
                        size={20} 
                        iconColor={theme.colors.primary}
                        onPress={() => setSelectedInfo(link)} 
                      />
                    )}
                    <IconButton 
                      icon="open-in-new" 
                      size={20} 
                      iconColor="#999"
                      onPress={() => handleOpenLink(link.url)} 
                    />
                  </View>
                )}
                onPress={() => handleOpenLink(link.url)}
                style={styles.listItem}
              />
              {index < UTILITY_LINKS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </Surface>
      </ScrollView>

      <Portal>
        <Dialog visible={!!selectedInfo} onDismiss={() => setSelectedInfo(null)} style={styles.dialog}>
          <Dialog.Title>{selectedInfo?.title} Info</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="bodyMedium" style={styles.infoText}>
                {selectedInfo?.info}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSelectedInfo(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: CONTAINER_PADDING,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  helperText: {
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  tileContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logo: {
    width: 58,
    height: 58,
  },
  tileTitle: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  utilityCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  listItem: {
    paddingVertical: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginLeft: 72,
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogScrollArea: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  infoText: {
    lineHeight: 24,
  }
});
