import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  VayyariAppIcon,
  VAYYARI_APP_ICON_PRESETS,
  type IconPreset,
  type IconShape,
  type LauncherTheme,
  type EmblemTone,
} from '../../components/atoms/VayyariAppIcon';

// Wallpaper presets matching real Android environments
const LIGHT_WALLPAPER =
  'radial-gradient(ellipse at 50% 20%, #C4CFDE 0%, #A6B4C8 40%, #8D9CB1 75%, #7D8CA2 100%)';
const DARK_WALLPAPER =
  'radial-gradient(ellipse at 50% 30%, #1A2138 0%, #0F1424 50%, #080B14 100%)';
const WARM_SUNSET_WALLPAPER =
  'linear-gradient(145deg, #EAD5C3 0%, #C9A992 50%, #8F725E 100%)';

const meta: Meta<typeof VayyariAppIcon> = {
  title: 'Atoms/Vayyari App Icon',
  component: VayyariAppIcon,
  args: {
    size: 72,
    shape: 'circle',
    background: 'obsidian-current',
    emblemScale: 0.64,
    emblemTone: 'gold',
    hasRim: false,
    emblemGlow: 'subtle',
    showLabel: true,
    labelText: 'Vayyari',
    launcherTheme: 'light',
    elevation: true,
  },
  argTypes: {
    size: {
      control: { type: 'range', min: 48, max: 144, step: 4 },
      description: 'Icon diameter in pixels (launcher standard is 64px - 72px)',
    },
    shape: {
      control: 'select',
      options: ['circle', 'squircle', 'rounded', 'teardrop', 'square'],
      description: 'Android adaptive mask shape (Pixel=circle, Samsung=squircle)',
    },
    background: {
      control: 'select',
      options: VAYYARI_APP_ICON_PRESETS.map((p) => p.id),
      description: 'Curated background variations',
    },
    launcherTheme: {
      control: 'radio',
      options: ['light', 'dark'],
      description: 'Android launcher theme (adjusts wallpaper & label contrast)',
    },
    emblemTone: {
      control: 'select',
      options: ['gold', 'radiant-gold', 'champagne', 'bronze-gold', 'monochrome-white'],
    },
    emblemGlow: {
      control: 'select',
      options: ['none', 'subtle', 'radiant', 'bloom'],
    },
    emblemScale: {
      control: { type: 'range', min: 0.5, max: 0.8, step: 0.02 },
      description: 'Emblem safe-zone scale (Android adaptive icon safe zone is 66%)',
    },
    hasRim: {
      control: 'boolean',
      description: 'Adds a refined 1.5px metallic/glass outer rim',
    },
    showLabel: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VayyariAppIcon>;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. DEFAULT INTERACTIVE SANDBOX
 * Live playground to tweak size, shape, background, and launcher theme.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const Default: Story = {
  render: (args) => {
    const isLight = args.launcherTheme === 'light';
    const activeWallpaper = isLight ? LIGHT_WALLPAPER : DARK_WALLPAPER;

    return (
      <YStack
        alignItems="center"
        justifyContent="center"
        padding={40}
        borderRadius={24}
        width={420}
        minHeight={340}
        style={{
          background: activeWallpaper,
          boxShadow: isLight
            ? '0 12px 36px rgba(0, 0, 0, 0.15)'
            : '0 16px 48px rgba(0, 0, 0, 0.65)',
        }}
        gap={20}
      >
        <VayyariAppIcon {...args} />

        {/* Informational Sub-badge */}
        <YStack
          alignItems="center"
          paddingHorizontal={16}
          paddingVertical={8}
          borderRadius={20}
          style={{
            background: isLight ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(10px)',
            border: isLight ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Text
            fontSize={11}
            fontWeight="700"
            color={isLight ? '#1f2937' : '#e5e7eb'}
            letterSpacing={0.5}
          >
            Android Launcher Mode: {args.launcherTheme?.toUpperCase()} • {args.shape?.toUpperCase()}
          </Text>
        </YStack>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. CURRENT BASELINE VS CANDIDATE VARIATIONS
 * Directly shows the user's current Android icon alongside all background options,
 * with real-time toggle between Light Mode and Dark Mode launchers.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BaselineVsVariations: StoryObj = {
  render: () => {
    const [launcherMode, setLauncherMode] = useState<'light' | 'dark' | 'split'>('light');
    const [selectedShape, setSelectedShape] = useState<IconShape>('circle');
    const [selectedPresetId, setSelectedPresetId] = useState<string>('signature-navy');

    const currentPreset = VAYYARI_APP_ICON_PRESETS[0]; // obsidian-current
    const candidatePresets = VAYYARI_APP_ICON_PRESETS.slice(1);

    const renderCard = (preset: IconPreset, isCurrent = false, theme: 'light' | 'dark') => {
      const isLight = theme === 'light';
      const isSelected = selectedPresetId === preset.id;

      return (
        <YStack
          key={`${preset.id}-${theme}`}
          alignItems="center"
          padding={18}
          borderRadius={18}
          width={180}
          cursor="pointer"
          onPress={() => setSelectedPresetId(preset.id)}
          style={{
            background: isLight ? LIGHT_WALLPAPER : DARK_WALLPAPER,
            border: isSelected
              ? '2px solid #D4AF37'
              : isLight
              ? '1px solid rgba(255,255,255,0.6)'
              : '1px solid rgba(255,255,255,0.12)',
            boxShadow: isSelected
              ? '0 0 16px rgba(212, 175, 55, 0.45)'
              : '0 4px 14px rgba(0,0,0,0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}
          gap={12}
        >
          {isCurrent && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: '#EF4444',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 9,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Current
            </div>
          )}

          {isSelected && !isCurrent && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: '#D4AF37',
                color: '#000000',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 9,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Selected
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <VayyariAppIcon
              size={68}
              shape={selectedShape}
              background={preset.id}
              hasRim={preset.hasRim}
              rimColor={preset.rimColor}
              emblemTone={preset.recommendedEmblemTone}
              showLabel={true}
              launcherTheme={theme}
            />
          </div>

          <YStack
            width="100%"
            paddingHorizontal={8}
            paddingVertical={6}
            borderRadius={10}
            style={{
              background: isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(10, 14, 22, 0.75)',
              backdropFilter: 'blur(8px)',
            }}
            gap={2}
          >
            <Text
              fontSize={11}
              fontWeight="800"
              color={isLight ? '#111827' : '#ffffff'}
              numberOfLines={1}
            >
              {preset.name}
            </Text>
            <Text
              fontSize={10}
              fontWeight="600"
              color="#D4AF37"
              fontFamily="monospace"
            >
              {preset.hexForAppJson}
            </Text>
          </YStack>
        </YStack>
      );
    };

    return (
      <YStack gap={24} maxWidth={960} width="100%">
        {/* Header & Controls Toolbar */}
        <YStack
          padding={24}
          borderRadius={20}
          backgroundColor="#0e121a"
          borderColor="#202738"
          borderWidth={1}
          gap={16}
        >
          <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={12}>
            <YStack gap={4}>
              <Text color="#ffffff" fontSize={18} fontWeight="800">
                Android App Icon Background Variations
              </Text>
              <Text color="#8b949e" fontSize={12}>
                Testing background tones for Vayyari under Android Light Mode and Dark Mode launchers.
              </Text>
            </YStack>

            {/* Launcher Mode Switcher */}
            <XStack
              backgroundColor="#161c28"
              padding={4}
              borderRadius={12}
              borderColor="#242e40"
              borderWidth={1}
              gap={4}
            >
              <button
                onClick={() => setLauncherMode('light')}
                style={{
                  background: launcherMode === 'light' ? '#D4AF37' : 'transparent',
                  color: launcherMode === 'light' ? '#000000' : '#8b949e',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ☀️ Light Mode (Photo)
              </button>
              <button
                onClick={() => setLauncherMode('dark')}
                style={{
                  background: launcherMode === 'dark' ? '#D4AF37' : 'transparent',
                  color: launcherMode === 'dark' ? '#000000' : '#8b949e',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🌙 Dark Mode
              </button>
              <button
                onClick={() => setLauncherMode('split')}
                style={{
                  background: launcherMode === 'split' ? '#D4AF37' : 'transparent',
                  color: launcherMode === 'split' ? '#000000' : '#8b949e',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ☯️ Dual Split
              </button>
            </XStack>
          </XStack>

          {/* Shape Mask Filter */}
          <XStack alignItems="center" gap={10} flexWrap="wrap">
            <Text color="#8b949e" fontSize={12} fontWeight="600">
              Adaptive Mask Shape:
            </Text>
            {(['circle', 'squircle', 'rounded', 'teardrop'] as IconShape[]).map((sh) => (
              <button
                key={sh}
                onClick={() => setSelectedShape(sh)}
                style={{
                  background: selectedShape === sh ? '#243048' : '#141822',
                  color: selectedShape === sh ? '#D4AF37' : '#8b949e',
                  border: selectedShape === sh ? '1px solid #D4AF37' : '1px solid #202738',
                  padding: '4px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {sh}
              </button>
            ))}
          </XStack>
        </YStack>

        {/* Selected Candidate Spotlight Comparison */}
        {(() => {
          const selected =
            VAYYARI_APP_ICON_PRESETS.find((p) => p.id === selectedPresetId) || candidatePresets[0];

          return (
            <YStack
              padding={24}
              borderRadius={20}
              backgroundColor="#111622"
              borderColor="#222b3e"
              borderWidth={1}
              gap={18}
            >
              <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
                <YStack gap={2}>
                  <Text color="#D4AF37" fontSize={11} fontWeight="800" textTransform="uppercase" letterSpacing={1}>
                    Head-to-Head Comparison
                  </Text>
                  <Text color="#ffffff" fontSize={16} fontWeight="800">
                    Current Baseline (#0C0E14) vs. {selected.name}
                  </Text>
                </YStack>
                <div
                  style={{
                    background: '#182030',
                    border: '1px solid #2b3952',
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#D4AF37',
                    fontWeight: 700,
                  }}
                >
                  app.json: &quot;backgroundColor&quot;: &quot;{selected.hexForAppJson}&quot;
                </div>
              </XStack>

              {/* Side-by-Side Launcher Mockup */}
              <XStack flexWrap="wrap" gap={20} justifyContent="center">
                {/* Current on Light Mode */}
                <YStack
                  flex={1}
                  minWidth={280}
                  padding={24}
                  borderRadius={20}
                  alignItems="center"
                  gap={16}
                  style={{
                    background: LIGHT_WALLPAPER,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
                >
                  <Text color="#1f2937" fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.5}>
                    Current on Light Launcher (Your Photo)
                  </Text>
                  <VayyariAppIcon
                    size={80}
                    shape={selectedShape}
                    background={currentPreset.id}
                    showLabel={true}
                    launcherTheme="light"
                  />
                  <Text color="#374151" fontSize={11} textAlign="center" maxWidth={240}>
                    Solid black circle. Stands out starkly against light backgrounds without edge softening.
                  </Text>
                </YStack>

                {/* Candidate on Light Mode */}
                <YStack
                  flex={1}
                  minWidth={280}
                  padding={24}
                  borderRadius={20}
                  alignItems="center"
                  gap={16}
                  style={{
                    background: LIGHT_WALLPAPER,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '2px solid rgba(212, 175, 55, 0.6)',
                  }}
                >
                  <Text color="#1f2937" fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.5}>
                    {selected.name} on Light
                  </Text>
                  <VayyariAppIcon
                    size={80}
                    shape={selectedShape}
                    background={selected.id}
                    hasRim={selected.hasRim}
                    rimColor={selected.rimColor}
                    emblemTone={selected.recommendedEmblemTone}
                    showLabel={true}
                    launcherTheme="light"
                  />
                  <Text color="#1f2937" fontSize={11} textAlign="center" maxWidth={240} fontWeight="500">
                    {selected.lightModeFit}
                  </Text>
                </YStack>

                {/* Candidate on Dark Mode */}
                <YStack
                  flex={1}
                  minWidth={280}
                  padding={24}
                  borderRadius={20}
                  alignItems="center"
                  gap={16}
                  style={{
                    background: DARK_WALLPAPER,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                  }}
                >
                  <Text color="#e5e7eb" fontSize={12} fontWeight="800" textTransform="uppercase" letterSpacing={0.5}>
                    {selected.name} on Dark
                  </Text>
                  <VayyariAppIcon
                    size={80}
                    shape={selectedShape}
                    background={selected.id}
                    hasRim={selected.hasRim}
                    rimColor={selected.rimColor}
                    emblemTone={selected.recommendedEmblemTone}
                    showLabel={true}
                    launcherTheme="dark"
                  />
                  <Text color="#9ca3af" fontSize={11} textAlign="center" maxWidth={240}>
                    {selected.darkModeFit}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          );
        })()}

        {/* Variations Grid */}
        <YStack gap={14}>
          <Text color="#ffffff" fontSize={16} fontWeight="800">
            Explore All 10 Background Variations (Click to Spotlight)
          </Text>

          <XStack flexWrap="wrap" gap={14} justifyContent="flex-start">
            {/* Show Current first */}
            {launcherMode === 'split' ? (
              <>
                {renderCard(currentPreset, true, 'light')}
                {renderCard(currentPreset, true, 'dark')}
              </>
            ) : (
              renderCard(currentPreset, true, launcherMode)
            )}

            {/* Show all candidates */}
            {candidatePresets.map((preset) =>
              launcherMode === 'split' ? (
                <React.Fragment key={preset.id}>
                  {renderCard(preset, false, 'light')}
                  {renderCard(preset, false, 'dark')}
                </React.Fragment>
              ) : (
                renderCard(preset, false, launcherMode)
              )
            )}
          </XStack>
        </YStack>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. REALISTIC ANDROID HOME SCREEN SIMULATOR
 * Recreates an authentic Android launcher screen (Pixel / Samsung) with standard
 * apps, search bar, and wallpaper to evaluate real-world aesthetic harmony.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const HomeScreenSimulator: StoryObj = {
  render: () => {
    const [wallpaper, setWallpaper] = useState<'light' | 'dark' | 'sunset'>('light');
    const [activeBackground, setActiveBackground] = useState<string>('signature-navy');
    const [iconShape, setIconShape] = useState<IconShape>('circle');

    const wallpaperMap = {
      light: LIGHT_WALLPAPER,
      dark: DARK_WALLPAPER,
      sunset: WARM_SUNSET_WALLPAPER,
    };

    const isLight = wallpaper === 'light' || wallpaper === 'sunset';
    const textColor = isLight ? '#1f2937' : '#f3f4f6';

    const dummyApps = [
      { name: 'Phone', bg: '#22C55E', iconText: '📞' },
      { name: 'Messages', bg: '#3B82F6', iconText: '💬' },
      { name: 'Chrome', bg: '#F59E0B', iconText: '🌐' },
      { name: 'Camera', bg: '#6B7280', iconText: '📷' },
      { name: 'Photos', bg: '#EC4899', iconText: '🌸' },
      { name: 'Settings', bg: '#475569', iconText: '⚙️' },
      { name: 'Maps', bg: '#10B981', iconText: '📍' },
    ];

    const currentPreset =
      VAYYARI_APP_ICON_PRESETS.find((p) => p.id === activeBackground) ||
      VAYYARI_APP_ICON_PRESETS[0];

    return (
      <YStack gap={20} alignItems="center" maxWidth={920} width="100%">
        {/* Simulator Control Bar */}
        <XStack
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          width="100%"
          padding={16}
          borderRadius={16}
          backgroundColor="#0e121a"
          borderColor="#202738"
          borderWidth={1}
          gap={12}
        >
          {/* Wallpaper selector */}
          <XStack alignItems="center" gap={8}>
            <Text color="#8b949e" fontSize={11} fontWeight="700">
              WALLPAPER:
            </Text>
            <button
              onClick={() => setWallpaper('light')}
              style={{
                background: wallpaper === 'light' ? '#D4AF37' : '#182030',
                color: wallpaper === 'light' ? '#000' : '#8b949e',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ☀️ Light (Photo)
            </button>
            <button
              onClick={() => setWallpaper('dark')}
              style={{
                background: wallpaper === 'dark' ? '#D4AF37' : '#182030',
                color: wallpaper === 'dark' ? '#000' : '#8b949e',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🌙 Dark AMOLED
            </button>
            <button
              onClick={() => setWallpaper('sunset')}
              style={{
                background: wallpaper === 'sunset' ? '#D4AF37' : '#182030',
                color: wallpaper === 'sunset' ? '#000' : '#8b949e',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🌅 Warm Sunset
            </button>
          </XStack>

          {/* Quick shape selector */}
          <XStack alignItems="center" gap={6}>
            <Text color="#8b949e" fontSize={11} fontWeight="700">
              SHAPE:
            </Text>
            {(['circle', 'squircle', 'rounded'] as IconShape[]).map((sh) => (
              <button
                key={sh}
                onClick={() => setIconShape(sh)}
                style={{
                  background: iconShape === sh ? '#D4AF37' : '#182030',
                  color: iconShape === sh ? '#000' : '#8b949e',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {sh}
              </button>
            ))}
          </XStack>

          {/* Quick preset selector */}
          <XStack alignItems="center" gap={8}>
            <Text color="#8b949e" fontSize={11} fontWeight="700">
              VAYYARI TONE:
            </Text>
            <select
              value={activeBackground}
              onChange={(e) => setActiveBackground(e.target.value)}
              style={{
                background: '#161d2a',
                color: '#D4AF37',
                border: '1px solid #28354c',
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {VAYYARI_APP_ICON_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.split(' (')[0]} ({p.hexForAppJson})
                </option>
              ))}
            </select>
          </XStack>
        </XStack>

        {/* Android Phone Mockup Frame */}
        <div
          style={{
            width: 360,
            height: 600,
            borderRadius: 44,
            border: '10px solid #1c2230',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), inset 0 0 3px rgba(255, 255, 255, 0.2)',
            background: wallpaperMap[wallpaper],
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'content-box',
          }}
        >
          {/* Status Bar */}
          <div
            style={{
              padding: '10px 20px 4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: textColor,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            <span>17:30</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10 }}>
              <span>5G</span>
              <span>📶</span>
              <span>🔋 92%</span>
            </div>
          </div>

          {/* Google Search Pill Widget */}
          <div style={{ padding: '0 16px', marginTop: 8 }}>
            <div
              style={{
                background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(28, 34, 46, 0.85)',
                backdropFilter: 'blur(12px)',
                borderRadius: 24,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.08)' : '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: '#4285F4' }}>G</span>
              <span style={{ fontSize: 12, color: isLight ? '#6b7280' : '#9ca3af' }}>Search...</span>
              <span style={{ fontSize: 13 }}>🎤</span>
            </div>
          </div>

          {/* 4x4 App Grid */}
          <div
            style={{
              padding: '16px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px 8px',
              justifyItems: 'center',
              alignItems: 'start',
            }}
          >
            {/* Dummy App 1: Camera */}
            {dummyApps.slice(0, 3).map((app) => (
              <YStack key={app.name} alignItems="center" gap={3}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    background: app.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {app.iconText}
                </div>
                <Text fontSize={10} fontWeight="500" color={textColor}>
                  {app.name}
                </Text>
              </YStack>
            ))}

            {/* Row 1 App 4: Photos */}
            <YStack alignItems="center" gap={3}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: dummyApps[4].bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                }}
              >
                {dummyApps[4].iconText}
              </div>
              <Text fontSize={10} fontWeight="500" color={textColor}>
                Photos
              </Text>
            </YStack>

            {/* Row 2 App 1: Maps */}
            <YStack alignItems="center" gap={3}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: dummyApps[6].bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                }}
              >
                {dummyApps[6].iconText}
              </div>
              <Text fontSize={10} fontWeight="500" color={textColor}>
                Maps
              </Text>
            </YStack>

            {/* Row 2 App 2: Settings */}
            <YStack alignItems="center" gap={3}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: dummyApps[5].bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                }}
              >
                {dummyApps[5].iconText}
              </div>
              <Text fontSize={10} fontWeight="500" color={textColor}>
                Settings
              </Text>
            </YStack>

            {/* Row 2 App 3: VAYYARI (HERO APP ICON UNDER TEST) */}
            <div
              style={{
                transform: 'scale(1.04)',
                position: 'relative',
              }}
            >
              <VayyariAppIcon
                size={56}
                shape={iconShape}
                background={currentPreset.id}
                hasRim={currentPreset.hasRim}
                rimColor={currentPreset.rimColor}
                emblemTone={currentPreset.recommendedEmblemTone}
                showLabel={true}
                launcherTheme={isLight ? 'light' : 'dark'}
              />
            </div>

            {/* Row 2 App 4: Camera */}
            <YStack alignItems="center" gap={3}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: dummyApps[3].bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                }}
              >
                {dummyApps[3].iconText}
              </div>
              <Text fontSize={10} fontWeight="500" color={textColor}>
                Camera
              </Text>
            </YStack>
          </div>

          {/* Bottom Dock Area */}
          <div
            style={{
              padding: '12px 16px 18px',
              background: isLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(10, 14, 22, 0.55)',
              backdropFilter: 'blur(16px)',
              borderTop: isLight ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            {dummyApps.slice(0, 4).map((app) => (
              <div
                key={`dock-${app.name}`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: app.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                {app.iconText}
              </div>
            ))}
          </div>
        </div>
      </YStack>
    );
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. ADAPTIVE SHAPES MATRIX
 * Tests how the selected background appears in Android circular, squircle,
 * rounded square, and teardrop shapes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const AdaptiveShapesMatrix: StoryObj = {
  render: () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const shapes: { shape: IconShape; label: string; desc: string }[] = [
      { shape: 'circle', label: 'Circle (Stock Android / Pixel)', desc: 'Standard Android 8-14 default circular mask' },
      { shape: 'squircle', label: 'Squircle (Samsung One UI)', desc: 'Samsung Galaxy home screen default' },
      { shape: 'rounded', label: 'Rounded Square (Xiaomi / ColorOS)', desc: 'Smooth squarish mask' },
      { shape: 'teardrop', label: 'Teardrop (Launcher Custom)', desc: 'Asymmetric directional launcher mask' },
      { shape: 'square', label: 'Square (1024x1024 Master)', desc: 'Unmasked icon master asset' },
    ];

    const keyVariations = [
      'obsidian-current',
      'gold-rimmed-obsidian',
      'signature-navy',
      'crimson-silk',
      'editorial-ivory',
    ];

    const isLight = theme === 'light';

    return (
      <YStack
        gap={20}
        padding={24}
        backgroundColor="#0c0e14"
        borderRadius={20}
        borderColor="#263143"
        borderWidth={1}
        maxWidth={920}
        width="100%"
      >
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <Text color="#ffffff" fontSize={18} fontWeight="800">
              Android Adaptive Mask Shape Compliance
            </Text>
            <Text color="#8b949e" fontSize={12}>
              Android enforces dynamic OEM masking. The gold emblem stays centered inside the 66% safe zone.
            </Text>
          </YStack>

          {/* Theme switcher */}
          <XStack backgroundColor="#141824" padding={4} borderRadius={10} gap={4}>
            <button
              onClick={() => setTheme('light')}
              style={{
                background: isLight ? '#D4AF37' : 'transparent',
                color: isLight ? '#000' : '#8b949e',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ☀️ Light Wallpaper
            </button>
            <button
              onClick={() => setTheme('dark')}
              style={{
                background: !isLight ? '#D4AF37' : 'transparent',
                color: !isLight ? '#000' : '#8b949e',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🌙 Dark Wallpaper
            </button>
          </XStack>
        </XStack>

        <YStack gap={16}>
          {shapes.map(({ shape, label, desc }) => (
            <YStack
              key={shape}
              padding={18}
              borderRadius={16}
              style={{
                background: isLight ? LIGHT_WALLPAPER : DARK_WALLPAPER,
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
              gap={12}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text color={isLight ? '#111827' : '#ffffff'} fontSize={13} fontWeight="800">
                  {label}
                </Text>
                <Text color={isLight ? '#4b5563' : '#9ca3af'} fontSize={11}>
                  {desc}
                </Text>
              </XStack>

              <XStack alignItems="center" gap={18} flexWrap="wrap">
                {keyVariations.map((pid) => {
                  const preset = VAYYARI_APP_ICON_PRESETS.find((p) => p.id === pid)!;
                  return (
                    <YStack key={pid} alignItems="center" gap={6}>
                      <VayyariAppIcon
                        size={60}
                        shape={shape}
                        background={preset.id}
                        hasRim={preset.hasRim}
                        rimColor={preset.rimColor}
                        emblemTone={preset.recommendedEmblemTone}
                        showLabel={false}
                        launcherTheme={theme}
                      />
                      <Text
                        color={isLight ? '#1f2937' : '#e5e7eb'}
                        fontSize={10}
                        fontWeight="700"
                        textAlign="center"
                        maxWidth={90}
                      >
                        {preset.name.split(' (')[0]}
                      </Text>
                    </YStack>
                  );
                })}
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
 * 5. CODE EXPORT HELPER (Ready for app.json)
 * Shows the exact JSON code to update src/store/app.json and rebuild the APK.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const CodeExportHelper: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>('signature-navy');
    const selected =
      VAYYARI_APP_ICON_PRESETS.find((p) => p.id === selectedId) ||
      VAYYARI_APP_ICON_PRESETS[1];

    const jsonSnippet = `{
  "expo": {
    "name": "Vayyari",
    "android": {
      "package": "com.vayyari.store",
      "adaptiveIcon": {
        "backgroundColor": "${selected.hexForAppJson}",
        "foregroundImage": "./assets/android-icon-foreground.png"
      }
    }
  }
}`;

    return (
      <YStack
        gap={20}
        padding={28}
        backgroundColor="#0c0e14"
        borderRadius={20}
        borderColor="#263143"
        borderWidth={1}
        maxWidth={720}
        width="100%"
      >
        <YStack gap={4}>
          <Text color="#ffffff" fontSize={18} fontWeight="800">
            One-Click app.json Deployment Snippet
          </Text>
          <Text color="#8b949e" fontSize={12}>
            Select your preferred background tone to generate the exact adaptiveIcon config for src/store/app.json.
          </Text>
        </YStack>

        {/* Preset Selector */}
        <XStack flexWrap="wrap" gap={8}>
          {VAYYARI_APP_ICON_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                background: selectedId === p.id ? '#D4AF37' : '#141824',
                color: selectedId === p.id ? '#000000' : '#8b949e',
                border: selectedId === p.id ? '1px solid #D4AF37' : '1px solid #232d40',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </XStack>

        {/* Live Preview */}
        <XStack
          alignItems="center"
          gap={20}
          padding={20}
          borderRadius={14}
          backgroundColor="#131722"
          borderColor="#202738"
          borderWidth={1}
        >
          <VayyariAppIcon
            size={76}
            background={selected.id}
            hasRim={selected.hasRim}
            rimColor={selected.rimColor}
            emblemTone={selected.recommendedEmblemTone}
            showLabel={true}
            launcherTheme="dark"
          />

          <YStack flex={1} gap={4}>
            <Text color="#ffffff" fontSize={14} fontWeight="800">
              {selected.name}
            </Text>
            <Text color="#D4AF37" fontSize={12} fontWeight="700">
              Background Hex: {selected.hexForAppJson}
            </Text>
            <Text color="#8b949e" fontSize={11}>
              {selected.description}
            </Text>
          </YStack>
        </XStack>

        {/* Code Block */}
        <div
          style={{
            background: '#07090e',
            border: '1px solid #1c2436',
            borderRadius: 12,
            padding: 16,
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#7ee787',
            whiteSpace: 'pre',
            overflowX: 'auto',
          }}
        >
          {jsonSnippet}
        </div>
      </YStack>
    );
  },
};
