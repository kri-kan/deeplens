import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import { SurveyTileGrid, SurveyTileItem } from '../../components/organisms/SurveyTileGrid';
import { getVectorIcon } from '../../components/atoms/SurveyOptionTile';
import { getSurveyTheme, SurveyThemeId } from '../../components/organisms/TypeformSurvey/themeConfig';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const sampleTiles: SurveyTileItem[] = [
  {
    id: 'kanjeevaram',
    title: 'Kanjeevaram',
    subtitle: 'Mulberry Silk',
    media: {
      type: 'icon',
      icon: getVectorIcon('crown', 36),
    },
  },
  {
    id: 'banarasi',
    title: 'Banarasi',
    subtitle: 'Floral Kadwa',
    media: {
      type: 'icon',
      icon: getVectorIcon('sparkles', 36),
    },
  },
  {
    id: 'organza',
    title: 'Tissue Organza',
    subtitle: 'Metallic Zari',
    media: {
      type: 'icon',
      icon: getVectorIcon('feather', 36),
    },
  },
  {
    id: 'chanderi_zari',
    title: 'Chanderi Zari',
    subtitle: 'Cotton-Silk',
    media: {
      type: 'icon',
      icon: getVectorIcon('layers', 36),
    },
  },
  {
    id: 'raw_silk_slub',
    title: 'Raw Tussar Silk',
    subtitle: 'Handspun Slub',
    media: {
      type: 'icon',
      icon: getVectorIcon('palette', 36),
    },
  },
  {
    id: 'paithani_peacock',
    title: 'Paithani Heritage',
    subtitle: 'Peacock Pallu',
    media: {
      type: 'icon',
      icon: getVectorIcon('gem', 36),
    },
  },
  {
    id: 'temple_zari',
    title: 'Temple Borders',
    subtitle: 'Korvai Motif',
    media: {
      type: 'icon',
      icon: getVectorIcon('landmark', 36),
    },
  },
  {
    id: 'antique_metallics',
    title: 'Antique Zari',
    subtitle: 'Gold Leaf Foil',
    media: {
      type: 'icon',
      icon: getVectorIcon('shield', 36),
    },
  },
  {
    id: 'prestige_gifting',
    title: 'Prestige Gifting',
    subtitle: 'Milestone Boxes',
    media: {
      type: 'icon',
      icon: getVectorIcon('gift', 36),
    },
  },
];

const meta: Meta = {
  title: 'Organisms/Survey/SurveyTileGrid',
  component: SurveyTileGrid,
  parameters: {
    layout: 'centered',
  },
  args: {
    ...THEME_ARGS,
    columns: 'auto',
    aspectRatio: '1:1',
    isMultiSelect: true,
    themeId: 'ivory-editorial',
  },
  argTypes: {
    ...THEME_ARG_TYPES,
    isMultiSelect: {
      control: 'boolean',
      description: 'Multi-select (checkmarks) vs Single-select (circular radio dots)',
    },
    columns: {
      control: 'select',
      options: ['auto', 2, 3, 4, 5],
      description: 'Number of columns or auto for responsive 3/4/5 columns',
    },
    aspectRatio: {
      control: 'select',
      options: ['1:1', '3:4', '4:3', '9:16'],
      description: 'Tile aspect ratio',
    },
    themeId: {
      control: 'select',
      options: ['ivory-editorial', 'vayyari-dark', 'store-luxe', 'royal-burgundy'],
    },
  },
};
export default meta;

export const InteractiveGrid: StoryObj = {
  render: (args: any) => {
    const isMultiSelect = args.isMultiSelect ?? true;
    const [selectedIds, setSelectedIds] = useState<string[]>(['kanjeevaram', 'chanderi_zari']);
    const theme = getSurveyTheme(args.themeId || 'ivory-editorial');

    // Keep state in sync with storybook controls panel
    useEffect(() => {
      if (!isMultiSelect && selectedIds.length > 1) {
        setSelectedIds([selectedIds[0]]);
      }
    }, [isMultiSelect]);

    const toggle = (id: string) => {
      if (!isMultiSelect) {
        setSelectedIds([id]);
      } else {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
      }
    };

    return (
      <YStack
        backgroundColor={theme.backgroundColor}
        padding={20}
        borderRadius={16}
        width="100%"
        maxWidth={args.columns === 5 ? 960 : args.columns === 4 ? 720 : 440}
        gap={14}
      >
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
          <Text color={theme.textHeading} fontSize={16} fontWeight="800">
            Survey Tile Grid Organism
          </Text>
          <Text color={theme.textMuted} fontSize={12}>
            {isMultiSelect ? 'Multi-Select (Checkmarks)' : 'Single-Select (Radio Dot)'}: {selectedIds.length} of {sampleTiles.length}
          </Text>
        </XStack>

        <SurveyTileGrid
          tiles={sampleTiles}
          selectedIds={selectedIds}
          onToggle={toggle}
          isMultiSelect={isMultiSelect}
          columns={args.columns}
          aspectRatio={args.aspectRatio}
          theme={theme}
        />
      </YStack>
    );
  },
};

export const SingleSelectGrid: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>('kanjeevaram');
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack width="100%" maxWidth={440} padding={16} backgroundColor={theme.backgroundColor} borderRadius={16} gap={12}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text color={theme.textHeading} fontSize={15} fontWeight="800">
            Single-Select Mode (Radio Dot Indicator)
          </Text>
          <Text color={theme.textMuted} fontSize={12}>
            Selected: {selectedId}
          </Text>
        </XStack>
        <SurveyTileGrid
          tiles={sampleTiles.slice(0, 6)}
          selectedIds={[selectedId]}
          onToggle={(id) => setSelectedId(id)}
          isMultiSelect={false}
          columns={3}
          aspectRatio="1:1"
          theme={theme}
        />
      </YStack>
    );
  },
};

export const Mobile3Columns: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['kanjeevaram']);
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack width={390} padding={16} backgroundColor={theme.backgroundColor} borderRadius={16}>
        <SurveyTileGrid
          tiles={sampleTiles.slice(0, 6)}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
          }
          columns={3}
          aspectRatio="1:1"
          theme={theme}
        />
      </YStack>
    );
  },
};

export const Tablet4Columns: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['kanjeevaram', 'organza']);
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack width={640} padding={20} backgroundColor={theme.backgroundColor} borderRadius={16}>
        <SurveyTileGrid
          tiles={sampleTiles.slice(0, 8)}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
          }
          columns={4}
          aspectRatio="3:4"
          theme={theme}
        />
      </YStack>
    );
  },
};

export const Desktop5Columns: StoryObj = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['kanjeevaram', 'antique_metallics']);
    const theme = getSurveyTheme('ivory-editorial');
    return (
      <YStack width={920} padding={24} backgroundColor={theme.backgroundColor} borderRadius={16}>
        <SurveyTileGrid
          tiles={sampleTiles}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
          }
          columns={5}
          aspectRatio="1:1"
          theme={theme}
        />
      </YStack>
    );
  },
};
