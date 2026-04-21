import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Surface, Text, Appbar, IconButton, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { BentoCard } from '@/components/ui/BentoCard';
import { TimelineItem } from '@/components/ui/TimelineItem';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Dashboard" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Orders Today */}
        <BentoCard>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>Orders Today</Text>
          <Text variant="displaySmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>₹1,24,500</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 4 }}>Total Transaction Value</Text>
        </BentoCard>

        {/* Split View */}
        <View style={styles.splitRow}>
          <BentoCard surfaceLevel="surfaceContainerLow" style={styles.splitCard}>
            <IconButton icon="bell-ring" containerColor={theme.colors.secondaryContainer} iconColor={theme.colors.onSecondaryContainer} size={28} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 12, fontWeight: 'bold' }}>Pending</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>3 Reminders</Text>
          </BentoCard>

          <BentoCard surfaceLevel="surfaceContainerLow" style={styles.splitCard}>
            <IconButton icon="truck-fast" containerColor={theme.colors.primaryContainer} iconColor={theme.colors.onPrimaryContainer} size={28} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 12, fontWeight: 'bold' }}>Logistics</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Partners Active</Text>
          </BentoCard>
        </View>

        {/* Timeline */}
        <BentoCard paddingBottom={8}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase' }}>Customer Timeline</Text>
          
          <TimelineItem
            icon="message-text"
            title="&quot;Can you please confirm the measurements for the Silk Saree (Order #8244)? I'm worried it might be too long.&quot;"
            timestampSubtitle="12 mins ago • Omnichannel Interaction"
          />

          <TimelineItem
            style={{ marginTop: 24 }}
            icon="instagram"
            iconBgColor={theme.colors.secondaryContainer}
            iconColor={theme.colors.onSecondaryContainer}
            title="Mentioned Vayyari in a story: &quot;Obsessed with the new fit! Highly recommend #VayyariStyle&quot;"
            timestampSubtitle="1 hr ago • Social Engagement"
          />

          <TimelineItem
            style={{ marginTop: 24, marginBottom: 16 }}
            icon="shopping-outline"
            iconBgColor={theme.colors.primaryContainer}
            iconColor={theme.colors.onPrimaryContainer}
            title="New Order #8245 placed by anonymous guest."
            timestampSubtitle="3 hrs ago • Transaction"
            extraNode={
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Subtotal: ₹8,400 | Item: Pashmina Wrap</Text>
            }
          />

        </BentoCard>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  splitCard: {
    width: '48%',
    marginBottom: 0,
  },
});
