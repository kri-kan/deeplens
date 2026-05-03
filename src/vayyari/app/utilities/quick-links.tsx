import React, { useState } from 'react';
import { StyleSheet, View, Linking, Image, ScrollView } from 'react-native';
import { Surface, List, Text, useTheme, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/layout/Section';
import { GridMenu } from '@/components/utility/GridMenu';

interface QuickLink {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  url: string;
  color: string;
  info?: string;
}

const COURIER_LOGOS: { [key: string]: any } = {
  'dtdc-tracking': require('@/assets/images/couriers/dtdc.png'),
  'india-post-tracking': require('@/assets/images/couriers/india-post.png'),
  'bluedart-tracking': require('@/assets/images/couriers/bluedart.png'),
  'shree-maruti-tracking': require('@/assets/images/couriers/shree-maruti.png'),
  'delhivery-tracking': require('@/assets/images/couriers/delhivery.png'),
};

export default function QuickLinksScreen() {
  const theme = useTheme();
  const [selectedInfo, setSelectedInfo] = useState<QuickLink | null>(null);

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('An error occurred', error);
    }
  };

  const COURIER_LINKS = [
    { id: 'dtdc-tracking', title: 'DTDC', url: 'https://www.dtdc.com/track-your-shipment/', color: '#004791' },
    { id: 'india-post-tracking', title: 'India Post', url: 'https://www.indiapost.gov.in/', color: '#DA251C' },
    { id: 'bluedart-tracking', title: 'Blue Dart', url: 'https://bluedart.com/tracking', color: '#004DAE' },
    { id: 'shree-maruti-tracking', title: 'Shree Maruti', url: 'https://shreemaruti.com/track-shipment/', color: '#F26522' },
    { id: 'delhivery-tracking', title: 'Delhivery', url: 'https://www.delhivery.com/tracking', color: '#1a1a1a' }
  ].map(link => ({
    ...link,
    icon: COURIER_LOGOS[link.id], // GridMenu expects icon as source
    onPress: () => handleOpenLink(link.url)
  }));

  const UTILITY_LINKS: QuickLink[] = [
    {
      id: 'fb-graph-explorer',
      title: 'Facebook Graph API Explorer',
      description: 'Generate short-lived user access tokens to be exchanged for long-lived tokens.',
      icon: 'facebook',
      url: 'https://developers.facebook.com/tools/explorer/',
      color: '#1877F2',
      info: `Required User Permissions:\n\n• manage_fundraisers\n• read_insights\n• publish_video\n• catalog_management\n• instagram_basic\n• instagram_manage_comments\n• instagram_manage_insights\n• instagram_content_publish\n• business_management\n• pages_messaging`
    }
  ];

  return (
    <ScreenWrapper title="Quick Links">
      <Section 
        title="Courier Tracking" 
        subtitle="Quickly track your shipments across major couriers."
        style={styles.section}
      >
        <GridMenu items={COURIER_LINKS} columns={4} />
      </Section>

      <Section 
        title="Utilities & Tools" 
        subtitle="External resources for application management."
        style={styles.section}
      >
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
      </Section>

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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 0, // GridMenu handles its own padding or container handles it
    marginVertical: 16,
  },
  utilityCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
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

