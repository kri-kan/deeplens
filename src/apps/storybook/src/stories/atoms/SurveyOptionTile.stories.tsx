import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  SurveyOptionTile,
  TileAspectRatio,
  SURVEY_ICON_CATALOG,
  SURVEY_ICON_IDS,
  getVectorIcon,
} from '../../components/atoms/SurveyOptionTile';
import { getSurveyTheme, SurveyThemeId } from '../../components/organisms/TypeformSurvey/themeConfig';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta = {
  title: 'Atoms/Survey/SurveyOptionTile',
  component: SurveyOptionTile,
  parameters: {
    layout: 'centered',
  },
  args: {
    ...THEME_ARGS,
    title: 'Kanjeevaram',
    subtitle: 'Mulberry Silk',
    aspectRatio: '1:1',
    mediaType: 'icon',
    iconName: 'crown',
    emoji: '👑',
    emojiSize: 36,
    imageUrl:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
    isSelected: false,
    isMultiSelect: true,
    themeId: 'ivory-editorial',
    width: 140,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    title: { control: 'text', description: 'Main tile label' },
    subtitle: { control: 'text', description: 'Sub-label beneath title' },
    aspectRatio: {
      control: 'select',
      options: ['1:1', '3:4', '4:3', '9:16'],
      description: 'Tile aspect ratio (1:1 Square, 3:4 Portrait, 4:3 Landscape, 9:16 Story)',
    },
    mediaType: {
      control: 'select',
      options: ['icon', 'image', 'emoji'],
      description: 'Media format inside tile button',
    },
    iconName: {
      control: 'select',
      options: SURVEY_ICON_IDS,
      description: 'Vector icon from store & admin catalog (45+ curated icons)',
    },
    emoji: { control: 'text', description: 'Emoji icon glyph' },
    emojiSize: { control: 'number', description: 'Custom emoji font size override' },
    imageUrl: { control: 'text', description: 'Image background URL (for image tiles)' },
    isSelected: { control: 'boolean', description: 'Selected state toggle' },
    isMultiSelect: {
      control: 'boolean',
      description: 'Selection mode: True = Checkmark, False = Radio Dot',
    },
    themeId: {
      control: 'select',
      options: ['ivory-editorial', 'vayyari-dark', 'store-luxe', 'royal-burgundy'],
    },
    tileBgColor: { control: 'color', description: 'Direct tile background color override' },
    tileBorderColor: { control: 'color', description: 'Direct tile border color override' },
    tileSelectedBgColor: { control: 'color', description: 'Direct selected background override' },
    tileSelectedBorderColor: { control: 'color', description: 'Direct selected border override' },
    width: { control: 'number', description: 'Preview tile width in pixels' },
  },
};
export default meta;

const QUICK_ICON_CHIPS = [
  'crown',
  'sparkles',
  'feather',
  'layers',
  'gem',
  'palette',
  'landmark',
  'shield',
  'gift',
  'shopping-bag',
  'store',
  'flame',
  'coins',
  'heart',
  'star',
  'package',
  'truck',
  'tag',
  'scissors',
  'shirt',
  'sun',
  'moon',
];

export const InteractiveCustomizer: StoryObj = {
  render: (args: any) => {
    // Synchronize local states with Storybook args so controls work both ways
    const [selected, setSelected] = useState<boolean>(args.isSelected ?? false);
    const [aspectRatio, setAspectRatio] = useState<TileAspectRatio>(args.aspectRatio || '1:1');
    const [mediaType, setMediaType] = useState<'icon' | 'image' | 'emoji'>(
      args.mediaType || 'icon'
    );
    const [iconName, setIconName] = useState<string>(args.iconName || 'crown');
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(args.isMultiSelect ?? true);

    useEffect(() => {
      setSelected(Boolean(args.isSelected));
    }, [args.isSelected]);

    useEffect(() => {
      if (args.aspectRatio) setAspectRatio(args.aspectRatio);
    }, [args.aspectRatio]);

    useEffect(() => {
      if (args.mediaType) setMediaType(args.mediaType);
    }, [args.mediaType]);

    useEffect(() => {
      if (args.iconName) setIconName(args.iconName);
    }, [args.iconName]);

    useEffect(() => {
      if (args.isMultiSelect !== undefined) setIsMultiSelect(args.isMultiSelect);
    }, [args.isMultiSelect]);

    const theme = getSurveyTheme(args.themeId || 'ivory-editorial');

    const mediaConfig = {
      type: mediaType,
      icon: getVectorIcon(iconName, 38),
      emoji: args.emoji || '👑',
      emojiSize: args.emojiSize,
      imageUrl: args.imageUrl,
      imageFillMode: 'card-full' as const,
    };

    return (
      <YStack
        width="100%"
        minHeight="100vh"
        backgroundColor={theme.backgroundColor}
        alignItems="center"
        justifyContent="center"
        padding={20}
        gap={20}
      >
        {/* In-Canvas Live Interactive Control Bar */}
        <YStack
          width="100%"
          maxWidth={580}
          backgroundColor={theme.surfaceColor}
          borderColor={theme.surfaceBorder}
          borderWidth={1}
          borderRadius={18}
          padding={16}
          gap={12}
          style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text color={theme.textHeading} fontSize={14} fontWeight="800">
              Interactive Tile Customizer Controls
            </Text>
            <Text color={theme.kickerColor} fontSize={11} fontWeight="700">
              {mediaType.toUpperCase()} MODE • {aspectRatio}
            </Text>
          </XStack>

          {/* 1. Aspect Ratio Radio Toggle Buttons */}
          <YStack gap={5}>
            <Text color={theme.textMuted} fontSize={11} fontWeight="700">
              ASPECT RATIO (RADIO SELECTION)
            </Text>
            <XStack gap={6} flexWrap="wrap">
              {(['1:1', '3:4', '4:3', '9:16'] as TileAspectRatio[]).map((ratio) => {
                const isActive = aspectRatio === ratio;
                return (
                  <XStack
                    key={ratio}
                    role="button"
                    cursor="pointer"
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={10}
                    backgroundColor={isActive ? theme.primaryButtonBg : 'transparent'}
                    borderColor={isActive ? theme.primaryButtonBg : theme.surfaceBorder}
                    borderWidth={1}
                    onPress={() => setAspectRatio(ratio)}
                    hoverStyle={{ opacity: isActive ? 1 : 0.8 }}
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    <Text
                      fontSize={11.5}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? theme.primaryButtonText : theme.textHeading}
                    >
                      {ratio === '1:1'
                        ? '1:1 Square'
                        : ratio === '3:4'
                        ? '3:4 Portrait'
                        : ratio === '4:3'
                        ? '4:3 Landscape'
                        : '9:16 Story'}
                    </Text>
                  </XStack>
                );
              })}
            </XStack>
          </YStack>

          {/* 2. Media Type Radio Toggle Buttons */}
          <YStack gap={5}>
            <Text color={theme.textMuted} fontSize={11} fontWeight="700">
              MEDIA FORMAT (RADIO SELECTION)
            </Text>
            <XStack gap={6} flexWrap="wrap">
              {[
                { id: 'icon', label: '✨ Vector Icon (Catalog)' },
                { id: 'image', label: '🖼️ Image Full Cover' },
                { id: 'emoji', label: '👑 Emoji' },
              ].map((m) => {
                const isActive = mediaType === m.id;
                return (
                  <XStack
                    key={m.id}
                    role="button"
                    cursor="pointer"
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={10}
                    backgroundColor={isActive ? theme.primaryButtonBg : 'transparent'}
                    borderColor={isActive ? theme.primaryButtonBg : theme.surfaceBorder}
                    borderWidth={1}
                    onPress={() => setMediaType(m.id as any)}
                    hoverStyle={{ opacity: isActive ? 1 : 0.8 }}
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    <Text
                      fontSize={11.5}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? theme.primaryButtonText : theme.textHeading}
                    >
                      {m.label}
                    </Text>
                  </XStack>
                );
              })}
            </XStack>
          </YStack>

          {/* 3. Icon Catalog Selector (When in Icon mode) */}
          {mediaType === 'icon' && (
            <YStack gap={6}>
              <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                SELECT FROM STORE & ADMIN ICON CATALOG ({SURVEY_ICON_IDS.length} ICONS)
              </Text>
              {/* Native Dropdown with Grouped Options */}
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${theme.surfaceBorder}`,
                  background: theme.backgroundColor,
                  color: theme.textHeading,
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <optgroup label="🏛️ Heritage & Textile Craft (Vayyari Core)">
                  {Object.values(SURVEY_ICON_CATALOG)
                    .filter((i) => i.category === 'heritage')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🛍️ Store & Collection Curation">
                  {Object.values(SURVEY_ICON_CATALOG)
                    .filter((i) => i.category === 'store')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="⚙️ Admin, Order & Operations">
                  {Object.values(SURVEY_ICON_CATALOG)
                    .filter((i) => i.category === 'admin')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
              </select>

              {/* Quick Pick Icon Chips */}
              <XStack gap={5} flexWrap="wrap" paddingTop={2}>
                {QUICK_ICON_CHIPS.map((chipId) => {
                  const isChipActive = iconName === chipId;
                  return (
                    <XStack
                      key={chipId}
                      role="button"
                      cursor="pointer"
                      paddingHorizontal={8}
                      paddingVertical={4}
                      borderRadius={8}
                      backgroundColor={isChipActive ? theme.kickerColor : theme.surfaceColor}
                      borderColor={isChipActive ? theme.kickerColor : theme.surfaceBorder}
                      borderWidth={1}
                      onPress={() => setIconName(chipId)}
                      hoverStyle={{ opacity: isChipActive ? 1 : 0.8 }}
                    >
                      <Text
                        fontSize={10.5}
                        fontWeight="700"
                        color={isChipActive ? '#ffffff' : theme.textHeading}
                      >
                        {chipId}
                      </Text>
                    </XStack>
                  );
                })}
              </XStack>
            </YStack>
          )}

          {/* 4. Selection State & Selection Mode Toggles */}
          <XStack gap={10} flexWrap="wrap">
            {/* Selection State Toggle */}
            <YStack flex={1} minWidth={140} gap={4}>
              <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                SELECTION STATE
              </Text>
              <XStack gap={4}>
                <XStack
                  flex={1}
                  role="button"
                  cursor="pointer"
                  paddingVertical={6}
                  borderRadius={8}
                  justifyContent="center"
                  alignItems="center"
                  backgroundColor={selected ? theme.primaryButtonBg : 'transparent'}
                  borderColor={selected ? theme.primaryButtonBg : theme.surfaceBorder}
                  borderWidth={1}
                  onPress={() => setSelected(true)}
                >
                  <Text
                    fontSize={11.5}
                    fontWeight="700"
                    color={selected ? theme.primaryButtonText : theme.textHeading}
                  >
                    ✓ Selected
                  </Text>
                </XStack>
                <XStack
                  flex={1}
                  role="button"
                  cursor="pointer"
                  paddingVertical={6}
                  borderRadius={8}
                  justifyContent="center"
                  alignItems="center"
                  backgroundColor={!selected ? theme.primaryButtonBg : 'transparent'}
                  borderColor={!selected ? theme.primaryButtonBg : theme.surfaceBorder}
                  borderWidth={1}
                  onPress={() => setSelected(false)}
                >
                  <Text
                    fontSize={11.5}
                    fontWeight="700"
                    color={!selected ? theme.primaryButtonText : theme.textHeading}
                  >
                    ○ Unselected
                  </Text>
                </XStack>
              </XStack>
            </YStack>

            {/* Selection Mode Toggle: Multi-Select vs Single-Select */}
            <YStack flex={1} minWidth={170} gap={4}>
              <Text color={theme.textMuted} fontSize={11} fontWeight="700">
                INDICATOR MODE
              </Text>
              <XStack gap={4}>
                <XStack
                  flex={1}
                  role="button"
                  cursor="pointer"
                  paddingVertical={6}
                  borderRadius={8}
                  justifyContent="center"
                  alignItems="center"
                  backgroundColor={isMultiSelect ? theme.primaryButtonBg : 'transparent'}
                  borderColor={isMultiSelect ? theme.primaryButtonBg : theme.surfaceBorder}
                  borderWidth={1}
                  onPress={() => setIsMultiSelect(true)}
                >
                  <Text
                    fontSize={11}
                    fontWeight="700"
                    color={isMultiSelect ? theme.primaryButtonText : theme.textHeading}
                  >
                    ☑ Multi (Check)
                  </Text>
                </XStack>
                <XStack
                  flex={1}
                  role="button"
                  cursor="pointer"
                  paddingVertical={6}
                  borderRadius={8}
                  justifyContent="center"
                  alignItems="center"
                  backgroundColor={!isMultiSelect ? theme.primaryButtonBg : 'transparent'}
                  borderColor={!isMultiSelect ? theme.primaryButtonBg : theme.surfaceBorder}
                  borderWidth={1}
                  onPress={() => setIsMultiSelect(false)}
                >
                  <Text
                    fontSize={11}
                    fontWeight="700"
                    color={!isMultiSelect ? theme.primaryButtonText : theme.textHeading}
                  >
                    🔘 Single (Radio)
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </XStack>
        </YStack>

        {/* Live Previewed Option Tile */}
        <YStack
          alignItems="center"
          justifyContent="center"
          padding={24}
          backgroundColor={theme.surfaceColor}
          borderColor={theme.surfaceBorder}
          borderWidth={1}
          borderRadius={18}
          gap={12}
        >
          <SurveyOptionTile
            id="custom_tile"
            title={args.title}
            subtitle={args.subtitle}
            aspectRatio={aspectRatio}
            media={mediaConfig}
            isSelected={selected}
            isMultiSelect={isMultiSelect}
            onToggle={() => setSelected(!selected)}
            theme={theme}
            tileBgColor={args.tileBgColor}
            tileBorderColor={args.tileBorderColor}
            tileSelectedBgColor={args.tileSelectedBgColor}
            tileSelectedBorderColor={args.tileSelectedBorderColor}
            width={args.width || 140}
          />
          <Text color={theme.textMuted} fontSize={12} fontWeight="600">
            {selected
              ? isMultiSelect
                ? '✓ Multi-Select Active (Checkmark Indicator)'
                : '🔘 Radio Active (Radio Dot Indicator)'
              : 'Tap tile to toggle selection state'}
          </Text>
        </YStack>
      </YStack>
    );
  },
};

/**
 * Story: Full Store & Admin Icon Catalog Showcase
 * Displays all 45+ icons categorized into Heritage, Store, and Admin groups.
 */
export const FullStoreAndAdminIconCatalog: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>('crown');
    const theme = getSurveyTheme('ivory-editorial');

    const categories = [
      { key: 'heritage', label: '🏛️ Heritage & Textile Craft' },
      { key: 'store', label: '🛍️ Store & Collection Curation' },
      { key: 'admin', label: '⚙️ Admin, Order & Operations' },
    ];

    return (
      <YStack
        width="100%"
        minHeight="100vh"
        backgroundColor={theme.backgroundColor}
        padding={24}
        gap={24}
        alignItems="center"
      >
        <YStack maxWidth={880} width="100%" gap={6} alignItems="center">
          <Text color={theme.kickerColor} fontSize={12} fontWeight="800" letterSpacing={1.5}>
            STORE & ADMIN ICON CATALOG
          </Text>
          <Text color={theme.textHeading} fontSize={22} fontWeight="800">
            Complete Vector Icon Registry ({SURVEY_ICON_IDS.length} Icons)
          </Text>
          <Text color={theme.textMuted} fontSize={13} maxWidth={540} textAlign="center">
            Tap any icon tile below to preview it with active selection styling.
          </Text>
        </YStack>

        {categories.map((cat) => {
          const catIcons = Object.values(SURVEY_ICON_CATALOG).filter(
            (i) => i.category === cat.key
          );
          return (
            <YStack key={cat.key} width="100%" maxWidth={880} gap={12}>
              <Text color={theme.textHeading} fontSize={16} fontWeight="800">
                {cat.label} ({catIcons.length})
              </Text>
              <XStack gap={10} flexWrap="wrap">
                {catIcons.map((item) => (
                  <YStack key={item.id} width={120}>
                    <SurveyOptionTile
                      id={item.id}
                      title={item.id}
                      subtitle={item.category}
                      aspectRatio="1:1"
                      media={{
                        type: 'icon',
                        icon: item.render(36),
                      }}
                      isSelected={selectedId === item.id}
                      onToggle={setSelectedId}
                      theme={theme}
                      width={120}
                    />
                  </YStack>
                ))}
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    );
  },
};

/**
 * Story: Single-Select (Radio Dot) vs Multi-Select (Checkmark)
 */
export const SingleSelectRadioVsMultiSelect: StoryObj = {
  render: () => {
    const [radioSelected, setRadioSelected] = useState<string>('kanjeevaram');
    const [multiSelected, setMultiSelected] = useState<string[]>(['kanjeevaram', 'organza']);
    const theme = getSurveyTheme('ivory-editorial');

    const toggleMulti = (id: string) => {
      setMultiSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    return (
      <YStack
        width="100%"
        minHeight="100vh"
        backgroundColor={theme.backgroundColor}
        padding={24}
        gap={28}
        alignItems="center"
      >
        {/* Single-Select Radio Mode */}
        <YStack maxWidth={680} width="100%" gap={10}>
          <Text color={theme.textHeading} fontSize={16} fontWeight="800">
            1. Single-Select Mode (`isMultiSelect: false` with Radio Dot Indicator)
          </Text>
          <Text color={theme.textMuted} fontSize={12}>
            Only one item can be chosen at a time. Selected tile displays a circular radio dot indicator.
          </Text>
          <XStack gap={12} flexWrap="wrap">
            {[
              { id: 'kanjeevaram', title: 'Kanjeevaram', icon: 'crown' },
              { id: 'banarasi', title: 'Banarasi', icon: 'sparkles' },
              { id: 'organza', title: 'Tissue Organza', icon: 'feather' },
            ].map((item) => (
              <YStack key={item.id} width={135}>
                <SurveyOptionTile
                  id={item.id}
                  title={item.title}
                  subtitle="Single-Select"
                  aspectRatio="1:1"
                  media={{ type: 'icon', icon: getVectorIcon(item.icon, 36) }}
                  isSelected={radioSelected === item.id}
                  isMultiSelect={false}
                  onToggle={setRadioSelected}
                  theme={theme}
                  width={135}
                />
              </YStack>
            ))}
          </XStack>
        </YStack>

        {/* Multi-Select Checkmark Mode */}
        <YStack maxWidth={680} width="100%" gap={10}>
          <Text color={theme.textHeading} fontSize={16} fontWeight="800">
            2. Multi-Select Mode (`isMultiSelect: true` with Solid Checkmark Pill)
          </Text>
          <Text color={theme.textMuted} fontSize={12}>
            Multiple items can be selected concurrently. Selected tiles display a solid checkmark badge.
          </Text>
          <XStack gap={12} flexWrap="wrap">
            {[
              { id: 'kanjeevaram', title: 'Kanjeevaram', icon: 'crown' },
              { id: 'banarasi', title: 'Banarasi', icon: 'sparkles' },
              { id: 'organza', title: 'Tissue Organza', icon: 'feather' },
            ].map((item) => (
              <YStack key={item.id} width={135}>
                <SurveyOptionTile
                  id={item.id}
                  title={item.title}
                  subtitle="Multi-Select"
                  aspectRatio="1:1"
                  media={{ type: 'icon', icon: getVectorIcon(item.icon, 36) }}
                  isSelected={multiSelected.includes(item.id)}
                  isMultiSelect={true}
                  onToggle={toggleMulti}
                  theme={theme}
                  width={135}
                />
              </YStack>
            ))}
          </XStack>
        </YStack>
      </YStack>
    );
  },
};

export const VectorIcon1to1: StoryObj = {
  render: () => {
    const [sel, setSel] = useState(false);
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack padding={20} backgroundColor={theme.backgroundColor} alignItems="center">
        <SurveyOptionTile
          id="v1"
          title="Kanjeevaram"
          subtitle="Royal Silk"
          aspectRatio="1:1"
          media={{
            type: 'icon',
            icon: getVectorIcon('crown', 36),
          }}
          isSelected={sel}
          onToggle={() => setSel(!sel)}
          theme={theme}
          width={130}
        />
      </YStack>
    );
  },
};

export const VectorIcon3to4: StoryObj = {
  render: () => {
    const [sel, setSel] = useState(true);
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack padding={20} backgroundColor={theme.backgroundColor} alignItems="center">
        <SurveyOptionTile
          id="v2"
          title="Banarasi"
          subtitle="Floral Kadwa"
          aspectRatio="3:4"
          media={{
            type: 'icon',
            icon: getVectorIcon('sparkles', 36),
          }}
          isSelected={sel}
          onToggle={() => setSel(!sel)}
          theme={theme}
          width={130}
        />
      </YStack>
    );
  },
};

export const VectorIconRowPreview: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['v1']);
    const theme = getSurveyTheme('ivory-editorial');

    const toggle = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    return (
      <YStack padding={20} backgroundColor={theme.backgroundColor} gap={14} alignItems="center">
        <Text color={theme.textHeading} fontSize={15} fontWeight="800">
          Pure Vector Icon Tiles (Single Button Container)
        </Text>
        <XStack gap={10} flexWrap="wrap" justifyContent="center">
          <SurveyOptionTile
            id="v1"
            title="Kanjeevaram"
            subtitle="Royal Silk"
            aspectRatio="1:1"
            media={{ type: 'icon', icon: getVectorIcon('crown', 36) }}
            isSelected={selectedIds.includes('v1')}
            onToggle={toggle}
            theme={theme}
            width={120}
          />
          <SurveyOptionTile
            id="v2"
            title="Banarasi"
            subtitle="Kadwa Brocade"
            aspectRatio="1:1"
            media={{ type: 'icon', icon: getVectorIcon('sparkles', 36) }}
            isSelected={selectedIds.includes('v2')}
            onToggle={toggle}
            theme={theme}
            width={120}
          />
          <SurveyOptionTile
            id="v3"
            title="Tissue Organza"
            subtitle="Metallic Zari"
            aspectRatio="1:1"
            media={{ type: 'icon', icon: getVectorIcon('feather', 36) }}
            isSelected={selectedIds.includes('v3')}
            onToggle={toggle}
            theme={theme}
            width={120}
          />
          <SurveyOptionTile
            id="v4"
            title="Chanderi Zari"
            subtitle="Cotton-Silk"
            aspectRatio="1:1"
            media={{ type: 'icon', icon: getVectorIcon('layers', 36) }}
            isSelected={selectedIds.includes('v4')}
            onToggle={toggle}
            theme={theme}
            width={120}
          />
        </XStack>
      </YStack>
    );
  },
};

export const ImageCoverTile1to1: StoryObj = {
  render: () => {
    const [sel, setSel] = useState(true);
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack padding={20} backgroundColor={theme.backgroundColor} alignItems="center">
        <SurveyOptionTile
          id="ic1"
          title="Chanderi Zari"
          subtitle="Cotton-Silk"
          aspectRatio="1:1"
          media={{
            type: 'image',
            imageUrl:
              'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
            imageFillMode: 'card-full',
          }}
          isSelected={sel}
          onToggle={() => setSel(!sel)}
          theme={theme}
          width={140}
        />
      </YStack>
    );
  },
};
