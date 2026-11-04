import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSearch, LuShoppingBag, LuSparkles } from 'react-icons/lu';
import { VayyariLogo } from '../../components/atoms/VayyariLogo';
import { MudraCoin } from '../../components/atoms/MudraCoin';
import { SurveyMudrasBadge } from '../../components/atoms/SurveyMudrasBadge';
import { getSurveyTheme } from '../../components/organisms/TypeformSurvey/themeConfig';

const meta: Meta<typeof VayyariLogo> = {
  title: 'Atoms/Vayyari Fashions Logo',
  component: VayyariLogo,
  args: {
    size: 44,
    variant: 'cinematic',
    tone: 'dark',
    isGlowing: true,
    glowMode: 'bloom',
    showSubtitle: true,
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 16, max: 140, step: 2 },
    },
    variant: {
      control: 'select',
      options: ['initial-v', 'cinematic', 'horizontal', 'emblem', 'stacked', 'wordmark'],
    },
    iconWeight: {
      control: 'radio',
      options: ['bold', 'standard'],
    },
    tone: {
      control: 'radio',
      options: ['dark', 'light', 'gold'],
    },
    glowMode: {
      control: 'select',
      options: ['bloom', 'radiant', 'subtle', 'none'],
    },
    isGlowing: {
      control: 'boolean',
    },
    showSubtitle: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VayyariLogo>;

export const Default: Story = {
  args: {
    size: 40,
    variant: 'horizontal',
    tone: 'dark',
    isGlowing: false,
  },
  render: (args) => (
    <YStack
      alignItems="center"
      justifyContent="center"
      padding={36}
      borderRadius={16}
      backgroundColor={args.tone === 'light' ? '#faf8f5' : '#0c0e14'}
      borderColor={args.tone === 'light' ? '#e2d9cc' : '#263143'}
      borderWidth={1}
      gap={20}
      minWidth={360}
    >
      <VayyariLogo {...args} />
      <Text
        color={args.tone === 'light' ? '#785b1a' : '#d4af37'}
        fontSize={12}
        fontWeight="700"
      >
        Vayyari Fashions Logo ({args.size}px • {args.variant} • {args.tone})
      </Text>
    </YStack>
  ),
};

export const Variants: StoryObj = {
  render: () => {
    return (
      <YStack
        gap={24}
        padding={28}
        backgroundColor="#0c0e14"
        borderRadius={16}
        maxWidth={720}
        width="100%"
      >
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={18} fontWeight="800">
            Brand Logo Lockup Formats
          </Text>
          <Text color="#8b949e" fontSize={12}>
            Five unified lockup variants catering to responsive headers, initial-V monograms, app icons, and luxury banners.
          </Text>
        </YStack>

        <XStack flexWrap="wrap" gap={18}>
          {/* 1. Initial-V Monogram Lockup (Featured) */}
          <YStack
            flex={1}
            minWidth={300}
            padding={20}
            borderRadius={12}
            backgroundColor="#141822"
            borderColor="#d4af37"
            borderWidth={1}
            gap={14}
            justifyContent="space-between"
          >
            <Text color="#d4af37" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
              1. Initial-V Monogram (Featured)
            </Text>
            <VayyariLogo variant="initial-v" size={48} tone="dark" />
            <Text color="#8b949e" fontSize={11}>
              Emblem stands in place of initial letter V, with AYYARI beside upper arms and FASHIONS spanning the lower loops.
            </Text>
          </YStack>

          {/* 2. Horizontal Lockup */}
          <YStack
            flex={1}
            minWidth={300}
            padding={20}
            borderRadius={12}
            backgroundColor="#141822"
            borderColor="#242c3d"
            borderWidth={1}
            gap={14}
            justifyContent="space-between"
          >
            <Text color="#8b949e" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
              2. Horizontal Lockup (Primary Nav)
            </Text>
            <VayyariLogo variant="horizontal" size={36} tone="dark" />
            <Text color="#8b949e" fontSize={11}>
              Standard lockup for navigation bars, top bars, and letterheads.
            </Text>
          </YStack>

          {/* 3. Stacked Lockup */}
          <YStack
            flex={1}
            minWidth={300}
            padding={20}
            borderRadius={12}
            backgroundColor="#141822"
            borderColor="#242c3d"
            borderWidth={1}
            gap={14}
            alignItems="center"
            justifyContent="space-between"
          >
            <Text color="#8b949e" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1} alignSelf="flex-start">
              3. Stacked Lockup (Hero / Splash)
            </Text>
            <VayyariLogo variant="stacked" size={44} tone="dark" />
            <Text color="#8b949e" fontSize={11} textAlign="center">
              Centered haute couture lockup for splash screens and packaging.
            </Text>
          </YStack>

          {/* 4. Emblem Only */}
          <YStack
            flex={1}
            minWidth={300}
            padding={20}
            borderRadius={12}
            backgroundColor="#141822"
            borderColor="#242c3d"
            borderWidth={1}
            gap={14}
            justifyContent="space-between"
          >
            <Text color="#8b949e" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
              4. Emblem Mark Only (Icon / Crest)
            </Text>
            <XStack alignItems="center" gap={16}>
              <VayyariLogo variant="emblem" size={36} isGlowing={true} />
              <VayyariLogo variant="emblem" size={48} />
              <VayyariLogo variant="emblem" size={24} />
            </XStack>
            <Text color="#8b949e" fontSize={11}>
              Standalone vector crest for mobile tab bars, avatars, and watermarks.
            </Text>
          </YStack>

          {/* 5. Wordmark Only */}
          <YStack
            flex={1}
            minWidth={300}
            padding={20}
            borderRadius={12}
            backgroundColor="#141822"
            borderColor="#242c3d"
            borderWidth={1}
            gap={14}
            justifyContent="space-between"
          >
            <Text color="#8b949e" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
              5. Wordmark Only (Typography)
            </Text>
            <VayyariLogo variant="wordmark" size={32} tone="dark" />
            <Text color="#8b949e" fontSize={11}>
              Minimalist haute couture typography for editorial body headers.
            </Text>
          </YStack>
        </XStack>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INITIAL-V MONOGRAM SHOWCASE
 * Emblem acts as initial letter 'V', with 'AYYARI' nestled beside upper arms
 * and 'FASHIONS' spanning the remaining base of the emblem beneath it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const InitialVMonogram: Story = {
  args: {
    size: 72,
    variant: 'initial-v',
    iconWeight: 'bold',
    tone: 'light',
    isGlowing: false,
    glowMode: 'none',
    showSubtitle: true,
  },
  render: (args) => {
    return (
      <YStack
        gap={32}
        maxWidth={880}
        width="100%"
        backgroundColor="#0c0e14"
        padding={28}
        borderRadius={20}
        borderColor="#1e2638"
        borderWidth={1}
      >
        {/* Header Overview */}
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={22} fontWeight="800">
            Initial-V Monogram Lockup
          </Text>
          <Text color="#8b949e" fontSize={13}>
            Integrated typographic monogram where the bold gold crest emblem assumes the role of the initial &apos;V&apos;,
            with &apos;AYYARI&apos; beside the upper arms and &apos;FASHIONS&apos; spanning the base below.
          </Text>
        </YStack>

        {/* 1. Side-by-Side Thematic Comparison (Editorial Ivory vs Midnight Obsidian) */}
        <XStack flexWrap="wrap" gap={20}>
          {/* Light Theme: 1:1 match to reference design */}
          <YStack
            flex={1}
            minWidth={340}
            padding={32}
            borderRadius={20}
            backgroundColor="#FAF8F5"
            borderColor="#e8decb"
            borderWidth={1}
            gap={20}
            style={{
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            }}
          >
            <YStack gap={2}>
              <Text color="#785b1a" fontSize={11} fontWeight="800" textTransform="uppercase" letterSpacing={1.2}>
                Editorial Ivory (Official Reference)
              </Text>
              <Text color="#6b7280" fontSize={12}>
                1:1 match with user specification, onyx luxury serif and bronze tracked subtitle.
              </Text>
            </YStack>

            <XStack paddingVertical={16} alignItems="center" justifyContent="center">
              <VayyariLogo
                variant="initial-v"
                size={args.size || 72}
                iconWeight={args.iconWeight || 'bold'}
                tone="light"
                showSubtitle={args.showSubtitle}
              />
            </XStack>

            <Text color="#8c7853" fontSize={11}>
              Font: Cinzel 900 • Size: {Math.round((args.size || 72) * 0.53)}px • Subtitle: Jost 700
            </Text>
          </YStack>

          {/* Dark Theme: Luxury AMOLED Black with Radiant Gold Glow */}
          <YStack
            flex={1}
            minWidth={340}
            padding={32}
            borderRadius={20}
            backgroundColor="#0C0E14"
            borderColor="#222b3a"
            borderWidth={1}
            gap={20}
            style={{
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            <YStack gap={2}>
              <Text color="#DDA91A" fontSize={11} fontWeight="800" textTransform="uppercase" letterSpacing={1.2}>
                Midnight Obsidian (Night Haute Couture)
              </Text>
              <Text color="#8b949e" fontSize={12}>
                Warm ivory lettering with radiant 24K gold glowing crest and tracked gold subtitle.
              </Text>
            </YStack>

            <XStack paddingVertical={16} alignItems="center" justifyContent="center">
              <VayyariLogo
                variant="initial-v"
                size={args.size || 72}
                iconWeight={args.iconWeight || 'bold'}
                tone="dark"
                glowMode="bloom"
                showSubtitle={args.showSubtitle}
              />
            </XStack>

            <Text color="#8b949e" fontSize={11}>
              Backdrop: #0C0E14 • Glow: Bloom • Gold Crest Emblem
            </Text>
          </YStack>
        </XStack>

        {/* 2. Emblem Weight Comparison: Bold vs Standard */}
        <YStack
          padding={28}
          borderRadius={18}
          backgroundColor="#121622"
          borderColor="#20283c"
          borderWidth={1}
          gap={20}
        >
          <YStack gap={4}>
            <Text color="#ffffff" fontSize={15} fontWeight="800">
              Emblem Weight Variations
            </Text>
            <Text color="#8b949e" fontSize={12}>
              Comparing the official bold crest icon against standard weight in the Initial-V layout.
            </Text>
          </YStack>

          <XStack flexWrap="wrap" gap={24} justifyContent="space-around">
            <YStack alignItems="center" gap={12} padding={20} borderRadius={14} backgroundColor="#0c0e14" flex={1} minWidth={240}>
              <Text color="#DDA91A" fontSize={12} fontWeight="700">
                Bold Crest (Official Icon Request)
              </Text>
              <VayyariLogo variant="initial-v" size={64} iconWeight="bold" tone="dark" />
              <Text color="#6b7280" fontSize={11}>
                iconWeight=&quot;bold&quot; (Enhanced stroke &amp; presence)
              </Text>
            </YStack>

            <YStack alignItems="center" gap={12} padding={20} borderRadius={14} backgroundColor="#0c0e14" flex={1} minWidth={240}>
              <Text color="#d4af37" fontSize={12} fontWeight="700">
                Standard Crest (Classic)
              </Text>
              <VayyariLogo variant="initial-v" size={64} iconWeight="standard" tone="dark" />
              <Text color="#6b7280" fontSize={11}>
                iconWeight=&quot;standard&quot; (Delicate filigree)
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* 3. Scale Progression */}
        <YStack
          padding={28}
          borderRadius={18}
          backgroundColor="#FAF8F5"
          borderColor="#e8decb"
          borderWidth={1}
          gap={20}
        >
          <YStack gap={4}>
            <Text color="#121826" fontSize={15} fontWeight="800">
              Scale Progression (Editorial Light)
            </Text>
            <Text color="#6b7280" fontSize={12}>
              Proportional typography and letterspacing responsiveness from compact header to grand banner.
            </Text>
          </YStack>

          <YStack gap={16}>
            {[
              { size: 40, label: 'Compact Header (40px)' },
              { size: 56, label: 'Hero Section (56px)' },
              { size: 72, label: 'Full Display (72px • Masterpiece)' },
              { size: 92, label: 'Luxury Billboard (92px)' },
            ].map((s) => (
              <XStack
                key={s.size}
                alignItems="center"
                justifyContent="space-between"
                padding={18}
                borderRadius={12}
                backgroundColor="#ffffff"
                borderColor="#eee3d3"
                borderWidth={1}
              >
                <Text color="#785b1a" fontSize={12} fontWeight="800" minWidth={140}>
                  {s.label}
                </Text>
                <VayyariLogo variant="initial-v" size={s.size} tone="light" />
              </XStack>
            ))}
          </YStack>
        </YStack>
      </YStack>
    );
  },
};

export const SizeSpectrum: StoryObj = {
  render: () => {
    const scales = [
      { size: 18, label: 'Micro Pill', variant: 'horizontal' as const },
      { size: 26, label: 'Mobile Nav', variant: 'horizontal' as const },
      { size: 36, label: 'Desktop Nav', variant: 'horizontal' as const },
      { size: 48, label: 'Modal / VIP Pass', variant: 'horizontal' as const },
      { size: 64, label: 'Hero Display', variant: 'horizontal' as const },
      { size: 84, label: 'Grand Lockup', variant: 'stacked' as const },
    ];

    return (
      <YStack
        gap={24}
        padding={28}
        backgroundColor="#0c0e14"
        borderRadius={16}
        maxWidth={760}
        width="100%"
      >
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={18} fontWeight="800">
            Resolution &amp; Scale Spectrum
          </Text>
          <Text color="#8b949e" fontSize={12}>
            Proportional font sizing, kerning tracking, and vector sharpness across all display sizes.
          </Text>
        </YStack>

        <YStack gap={16}>
          {scales.map(({ size, label, variant }) => (
            <XStack
              key={size}
              alignItems="center"
              justifyContent="space-between"
              padding={16}
              borderRadius={12}
              backgroundColor="#141822"
              borderColor="#242c3d"
              borderWidth={1}
              gap={16}
            >
              <YStack minWidth={120}>
                <Text color="#d4af37" fontSize={12} fontWeight="800">
                  {size}px
                </Text>
                <Text color="#8b949e" fontSize={10}>
                  {label}
                </Text>
              </YStack>

              <XStack flex={1} justifyContent="center">
                <VayyariLogo size={size} variant={variant} tone="dark" />
              </XStack>
            </XStack>
          ))}
        </YStack>
      </YStack>
    );
  },
};

export const CampaignThemes: StoryObj = {
  render: () => {
    return (
      <YStack gap={20} maxWidth={720} width="100%">
        {/* Theme 1: Luxe Dark Obsidian */}
        <YStack
          padding={24}
          borderRadius={16}
          backgroundColor="#0a0c10"
          borderColor="#202636"
          borderWidth={1}
          gap={12}
        >
          <Text color="#8b949e" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
            Vayyari Dark (Obsidian &amp; Luminous Champagne)
          </Text>
          <XStack alignItems="center" justifyContent="space-between">
            <VayyariLogo size={36} variant="horizontal" tone="dark" isGlowing={true} />
            <VayyariLogo size={36} variant="emblem" tone="dark" isGlowing={true} />
          </XStack>
        </YStack>

        {/* Theme 2: Editorial Ivory Light */}
        <YStack
          padding={24}
          borderRadius={16}
          backgroundColor="#faf7f2"
          borderColor="#e8dec8"
          borderWidth={1}
          gap={12}
        >
          <Text color="#785b1a" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
            Ivory Editorial (Warm Silk &amp; Deep Bronze)
          </Text>
          <XStack alignItems="center" justifyContent="space-between">
            <VayyariLogo size={36} variant="horizontal" tone="light" />
            <VayyariLogo size={36} variant="emblem" tone="light" />
          </XStack>
        </YStack>

        {/* Theme 3: Radiant Gold Luxury */}
        <YStack
          padding={24}
          borderRadius={16}
          backgroundColor="#130e06"
          borderColor="#543e0e"
          borderWidth={1}
          gap={12}
        >
          <Text color="#ffd700" fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={1}>
            Radiant Gold (Festive &amp; VIP Vault)
          </Text>
          <XStack alignItems="center" justifyContent="space-between">
            <VayyariLogo size={36} variant="horizontal" tone="gold" isGlowing={true} />
            <VayyariLogo size={36} variant="emblem" tone="gold" isGlowing={true} />
          </XStack>
        </YStack>
      </YStack>
    );
  },
};

export const HeaderAndNavContext: StoryObj = {
  render: () => {
    const ivoryTheme = getSurveyTheme('ivory-editorial');
    const darkTheme = getSurveyTheme('vayyari-dark');

    return (
      <YStack gap={24} maxWidth={720} width="100%">
        {/* Context 1: Dark Luxury Navigation Bar */}
        <YStack gap={8}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            1. Luxury E-Commerce Navigation Bar (Dark Theme)
          </Text>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={12}
            backgroundColor="#0b0e14"
            borderColor="#222b3a"
            borderWidth={1}
            borderRadius={14}
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            <VayyariLogo size={28} variant="horizontal" tone="dark" />

            <XStack alignItems="center" gap={12}>
              {/* Search Icon */}
              <XStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="#161c28"
                alignItems="center"
                justifyContent="center"
              >
                <LuSearch size={15} color="#8b949e" />
              </XStack>

              {/* Compact Mudra Balance Badge */}
              <SurveyMudrasBadge amount={1425} theme={darkTheme} variant="compact" isPulsing={true} />

              {/* Cart Button */}
              <XStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="#161c28"
                alignItems="center"
                justifyContent="center"
              >
                <LuShoppingBag size={15} color="#8b949e" />
              </XStack>
            </XStack>
          </XStack>
        </YStack>

        {/* Context 2: Editorial Light Navigation Bar */}
        <YStack gap={8}>
          <Text color="#8b949e" fontSize={12} fontWeight="700">
            2. Editorial Light Header
          </Text>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={12}
            backgroundColor="#faf8f5"
            borderColor="#e8dfd3"
            borderWidth={1}
            borderRadius={14}
            style={{
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            }}
          >
            <VayyariLogo size={28} variant="horizontal" tone="light" />

            <XStack alignItems="center" gap={12}>
              <SurveyMudrasBadge amount={700} theme={ivoryTheme} variant="compact" />
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CINEMATIC SILK HERO STORY
 * Replicates the haute couture brand masterpiece attached by the user:
 * Gold crest + illuminated serif typography with radiant golden bloom glow
 * over draped luxury dark silk fabric folds.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const CinematicSilkHero: StoryObj<typeof VayyariLogo> = {
  args: {
    size: 72,
    variant: 'cinematic',
    glowMode: 'bloom',
    tone: 'dark',
    isGlowing: true,
    showSubtitle: true,
    backdrop: 'crimson-silk',
  },
  argTypes: {
    backdrop: {
      control: 'select',
      options: ['crimson-silk', 'emerald-silk', 'midnight-onyx', 'royal-sapphire', 'reference-image', 'transparent'],
    },
    glowMode: {
      control: 'select',
      options: ['bloom', 'radiant', 'subtle', 'none'],
    },
    size: {
      control: { type: 'range', min: 32, max: 140, step: 2 },
    },
  },
  render: (args) => {
    const backdropStyles: Record<string, any> = {
      'crimson-silk': {
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(160, 24, 44, 0.45) 0%, rgba(35, 6, 12, 0.95) 60%, #0c0205 100%), linear-gradient(135deg, #180306 0%, #3e0712 20%, #1a0307 40%, #520918 60%, #150205 80%, #2a040b 100%)',
        boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.9), 0 16px 48px rgba(0, 0, 0, 0.7)',
        borderColor: '#4d0b17',
      },
      'emerald-silk': {
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(12, 90, 48, 0.45) 0%, rgba(4, 28, 14, 0.95) 60%, #010d06 100%), linear-gradient(135deg, #02140a 0%, #084020 20%, #031c0e 40%, #0c562c 60%, #021208 80%, #063219 100%)',
        boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.9), 0 16px 48px rgba(0, 0, 0, 0.7)',
        borderColor: '#0a4220',
      },
      'midnight-onyx': {
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(35, 45, 65, 0.45) 0%, rgba(10, 13, 20, 0.95) 60%, #05060a 100%), linear-gradient(135deg, #07090e 0%, #1c2333 20%, #0c0f16 40%, #253046 60%, #080a0f 80%, #161b28 100%)',
        boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.9), 0 16px 48px rgba(0, 0, 0, 0.7)',
        borderColor: '#242e44',
      },
      'royal-sapphire': {
        background:
          'radial-gradient(ellipse at 50% 45%, rgba(20, 50, 120, 0.45) 0%, rgba(5, 12, 35, 0.95) 60%, #020512 100%), linear-gradient(135deg, #050a1e 0%, #12245c 20%, #070e28 40%, #1a3480 60%, #040818 80%, #0f1e4d 100%)',
        boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.9), 0 16px 48px rgba(0, 0, 0, 0.7)',
        borderColor: '#193375',
      },
      'reference-image': {
        backgroundImage: 'url(/assets/brand-reference-silk.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.6), 0 16px 48px rgba(0, 0, 0, 0.7)',
        borderColor: '#4d0b17',
      },
      transparent: {
        backgroundColor: '#0c0e14',
        borderColor: '#263143',
      },
    };

    const currentBackdrop = args.backdrop ?? 'crimson-silk';
    const activeBackdropStyle = backdropStyles[currentBackdrop] || backdropStyles['crimson-silk'];

    return (
      <YStack gap={20} alignItems="center" maxWidth={920} width="100%">
        {/* Master Cinema Canvas */}
        <YStack
          alignItems="center"
          justifyContent="center"
          width="100%"
          minHeight={320}
          paddingVertical={56}
          paddingHorizontal={36}
          borderRadius={24}
          borderWidth={1}
          position="relative"
          overflow="hidden"
          style={activeBackdropStyle}
        >
          {/* Subtle silk weave atmospheric overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 50% 30%, rgba(255, 235, 180, 0.08) 0%, transparent 60%)',
            }}
          />

          {/* Vayyari Brand Masterpiece Lockup */}
          <VayyariLogo
            size={args.size}
            variant={args.variant}
            tone={args.tone}
            glowMode={args.glowMode}
            isGlowing={args.isGlowing}
            showSubtitle={args.showSubtitle}
          />
        </YStack>

        {/* Informational Descriptor Badge */}
        <XStack
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          paddingHorizontal={20}
          paddingVertical={12}
          borderRadius={12}
          backgroundColor="#10141e"
          borderColor="#1f2838"
          borderWidth={1}
        >
          <XStack alignItems="center" gap={8}>
            <LuSparkles color="#d4af37" size={16} />
            <Text color="#ffffff" fontSize={12} fontWeight="700">
              Cinematic Haute Couture Representation
            </Text>
          </XStack>
          <Text color="#8b949e" fontSize={11}>
            Backdrop: <Text color="#d4af37" fontWeight="700">{currentBackdrop}</Text> • Glow: <Text color="#d4af37" fontWeight="700">{args.glowMode}</Text> • Size: <Text color="#d4af37" fontWeight="700">{args.size}px</Text>
          </Text>
        </XStack>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CINEMATIC VARIANTS SHOWCASE
 * Compares the 4 silk colorways (Ruby Crimson, Emerald Velvet, Obsidian Onyx, Royal Sapphire)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const CinematicVariantsShowcase: StoryObj = {
  render: () => {
    const silkThemes = [
      {
        id: 'crimson',
        title: '1. Ruby Crimson Silk (Masterpiece Reference)',
        subtitle: 'Signature bridal couture backdrop with imperial radiant bloom glow',
        style: {
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(160, 24, 44, 0.45) 0%, rgba(35, 6, 12, 0.95) 60%, #0c0205 100%), linear-gradient(135deg, #180306 0%, #3e0712 25%, #1a0307 50%, #520918 75%, #0e0204 100%)',
          borderColor: '#4d0b17',
        },
      },
      {
        id: 'emerald',
        title: '2. Emerald Velvet Silk (Heritage Royal)',
        subtitle: 'Deep ceremonial emerald silk with golden crest illumination',
        style: {
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(12, 90, 48, 0.45) 0%, rgba(4, 28, 14, 0.95) 60%, #010d06 100%), linear-gradient(135deg, #02140a 0%, #084020 25%, #031c0e 50%, #0c562c 75%, #021208 100%)',
          borderColor: '#0a4220',
        },
      },
      {
        id: 'onyx',
        title: '3. Midnight Obsidian Onyx (Luxe Minimalist)',
        subtitle: 'Ultra-dark ripples emphasizing the 24K pure gold vector crest',
        style: {
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(35, 45, 65, 0.45) 0%, rgba(10, 13, 20, 0.95) 60%, #05060a 100%), linear-gradient(135deg, #07090e 0%, #1c2333 25%, #0c0f16 50%, #253046 75%, #080a0f 100%)',
          borderColor: '#242e44',
        },
      },
      {
        id: 'sapphire',
        title: '4. Imperial Sapphire Silk (Evening Gala)',
        subtitle: 'Royal celestial navy silk folds with warm champagne radiance',
        style: {
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(20, 50, 120, 0.45) 0%, rgba(5, 12, 35, 0.95) 60%, #020512 100%), linear-gradient(135deg, #050a1e 0%, #12245c 25%, #070e28 50%, #1a3480 75%, #040818 100%)',
          borderColor: '#193375',
        },
      },
    ];

    return (
      <YStack gap={24} maxWidth={920} width="100%">
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={20} fontWeight="800">
            Cinematic Silk Fabric Themes
          </Text>
          <Text color="#8b949e" fontSize={13}>
            Four haute couture textile environments paired with the illuminated gold brand crest and typography.
          </Text>
        </YStack>

        <YStack gap={20}>
          {silkThemes.map((theme) => (
            <YStack
              key={theme.id}
              borderRadius={20}
              borderWidth={1}
              overflow="hidden"
              style={{
                ...theme.style,
                boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.5)',
              }}
              padding={32}
              gap={16}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="#ffffff" fontSize={14} fontWeight="800">
                  {theme.title}
                </Text>
                <Text color="#8b949e" fontSize={11}>
                  {theme.subtitle}
                </Text>
              </XStack>

              <XStack alignItems="center" justifyContent="center" paddingVertical={24}>
                <VayyariLogo size={56} variant="cinematic" glowMode="bloom" />
              </XStack>
            </YStack>
          ))}
        </YStack>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LIGHTING MOODS SHOWCASE
 * Compares Bloom, Radiant, Subtle, and None glow levels
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const LightingMoodsShowcase: StoryObj = {
  render: () => {
    const moods = [
      { id: 'bloom', title: 'Bloom (Illuminated Gold Aura)', glowMode: 'bloom' as const },
      { id: 'radiant', title: 'Radiant (Warm Dispersion)', glowMode: 'radiant' as const },
      { id: 'subtle', title: 'Subtle (Refined Accent)', glowMode: 'subtle' as const },
      { id: 'none', title: 'None (Pure Vector)', glowMode: 'none' as const },
    ];

    return (
      <YStack
        gap={20}
        padding={28}
        backgroundColor="#0a0c12"
        borderRadius={20}
        borderColor="#1e2536"
        borderWidth={1}
        maxWidth={840}
        width="100%"
      >
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={18} fontWeight="800">
            Atmospheric Lighting &amp; Bloom Modes
          </Text>
          <Text color="#8b949e" fontSize={12}>
            Dynamic multi-tier drop-shadow and typography bloom intensities for various digital placements.
          </Text>
        </YStack>

        <YStack gap={14}>
          {moods.map((mood) => (
            <XStack
              key={mood.id}
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={24}
              paddingVertical={18}
              backgroundColor="#121622"
              borderColor="#212a3d"
              borderWidth={1}
              borderRadius={14}
            >
              <YStack minWidth={220}>
                <Text color="#ffffff" fontSize={13} fontWeight="700">
                  {mood.title}
                </Text>
                <Text color="#d4af37" fontSize={11}>
                  glowMode=&quot;{mood.glowMode}&quot;
                </Text>
              </YStack>

              <XStack flex={1} justifyContent="center">
                <VayyariLogo size={42} variant="cinematic" glowMode={mood.glowMode} />
              </XStack>
            </XStack>
          ))}
        </YStack>
      </YStack>
    );
  },
};
