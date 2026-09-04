import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme, CAMPAIGN_REGISTRY, AVAILABLE_CAMPAIGNS } from '../../theme';
import type { CampaignName, ColorScheme } from '../../theme/types';

import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
function ThemeExplorer() {
  const { campaign, colorScheme, tokens, setCampaign, setColorScheme, toggleColorScheme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.text }]}>🎨 Dynamic Campaign Theme Engine</Text>
        <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
          Active: <Text style={{ fontWeight: '700', color: tokens.accent }}>{CAMPAIGN_REGISTRY[campaign].displayName}</Text> ({colorScheme})
        </Text>
        <Text style={[styles.description, { color: tokens.textMuted }]}>
          {CAMPAIGN_REGISTRY[campaign].description}
        </Text>
      </View>

      {/* Campaign Selector Buttons */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Switch Campaign</Text>
        <View style={styles.buttonRow}>
          {AVAILABLE_CAMPAIGNS.map((cName) => {
            const isSelected = campaign === cName;
            const def = CAMPAIGN_REGISTRY[cName];
            return (
              <Pressable
                key={cName}
                onPress={() => setCampaign(cName)}
                style={[
                  styles.campaignBtn,
                  {
                    backgroundColor: isSelected ? tokens.accent : tokens.surface,
                    borderColor: isSelected ? tokens.accent : tokens.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.campaignBtnText,
                    { color: isSelected ? tokens.accentForeground : tokens.text },
                  ]}
                >
                  {def.name.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Mode Switcher */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Mode</Text>
        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => setColorScheme('light')}
            style={[
              styles.modeBtn,
              {
                backgroundColor: colorScheme === 'light' ? tokens.accent : tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={{ color: colorScheme === 'light' ? tokens.accentForeground : tokens.text, fontWeight: '600' }}>
              ☀️ Light Mode
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setColorScheme('dark')}
            style={[
              styles.modeBtn,
              {
                backgroundColor: colorScheme === 'dark' ? tokens.accent : tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={{ color: colorScheme === 'dark' ? tokens.accentForeground : tokens.text, fontWeight: '600' }}>
              🌙 Dark Mode
            </Text>
          </Pressable>
          <Pressable
            onPress={toggleColorScheme}
            style={[styles.modeBtn, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}
          >
            <Text style={{ color: tokens.text, fontWeight: '600' }}>⇄ Toggle</Text>
          </Pressable>
        </View>
      </View>

      {/* Color Swatches */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Active Tokens</Text>
        <View style={styles.swatchGrid}>
          {[
            { label: 'Background', val: tokens.background },
            { label: 'Surface', val: tokens.surface },
            { label: 'Surface Raised', val: tokens.surfaceRaised },
            { label: 'Accent', val: tokens.accent },
            { label: 'Accent Subtle', val: tokens.accentSubtle },
            { label: 'Text', val: tokens.text },
            { label: 'Text Secondary', val: tokens.textSecondary },
            { label: 'Border', val: tokens.border },
            { label: 'Discount Price', val: tokens.priceDiscounted },
            { label: 'Offer Badge', val: tokens.badgeOffer },
          ].map((item) => (
            <View key={item.label} style={[styles.swatchCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <View style={[styles.swatchColor, { backgroundColor: item.val, borderColor: tokens.border }]} />
              <View style={styles.swatchMeta}>
                <Text style={[styles.swatchLabel, { color: tokens.text }]}>{item.label}</Text>
                <Text style={[styles.swatchHex, { color: tokens.textSecondary }]}>{item.val}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Live E-Commerce Component Preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Live Components Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.previewHeader}>
            <View style={[styles.badge, { backgroundColor: tokens.badgeOffer }]}>
              <Text style={[styles.badgeText, { color: tokens.badgeOfferText }]}>34% OFF</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: tokens.badgeSale }]}>
              <Text style={[styles.badgeText, { color: tokens.badgeSaleText }]}>LIMITED</Text>
            </View>
          </View>
          <Text style={[styles.productTitle, { color: tokens.text }]}>Handcrafted Silk Edit</Text>
          <Text style={[styles.productSubtitle, { color: tokens.textSecondary }]}>
            Campaign Exclusive • Limited Edition Collection
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.discountPrice, { color: tokens.priceDiscounted }]}>₹3,299</Text>
            <Text style={[styles.originalPrice, { color: tokens.priceOriginal }]}>₹4,999</Text>
          </View>
          <Pressable style={[styles.ctaBtn, { backgroundColor: tokens.accent }]}>
            <Text style={[styles.ctaText, { color: tokens.accentForeground }]}>Add to Bag</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const meta: Meta<any> = {
  args: {
    ...THEME_ARGS,
  },
  title: 'Themes/Campaign Explorer',
  component: ThemeExplorer,
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

export const Interactive: Story = {};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  campaignBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  campaignBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    width: '48%',
    minWidth: 150,
  },
  swatchColor: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 10,
  },
  swatchMeta: {
    flex: 1,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  swatchHex: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  previewCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 380,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  productSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  discountPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  ctaBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
