import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  MudrasVaultHud,
  FabricSwatchCard,
  CraftsmanshipPills,
  ColorMoodSelector,
  VIPContactCard,
  GoldVIPPassCard,
  TypeformMultipleChoice,
  TypeformTextInput,
  TypeformGenderSelection,
  TypeformThinProgressBar,
  TypeformDotSequence,
  TypeformNavFooter,
  DeepstashProgressHeader,
  OptionTileGrid,
  LikertScaleRow,
  ConfigurableTile,
  getSurveyTheme,
  FABRIC_SWATCHES,
  CRAFTSMANSHIP_OPTIONS,
  COLOR_MOODS,
  SurveyLanguage,
} from '../../components/organisms/TypeformSurvey';
import { getVectorIcon } from '../../components/atoms/SurveyOptionTile';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';

const meta: Meta<any> = {
  title: 'Organisms/Prelaunch/Typeform Components',
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};

export default meta;
type Story = StoryObj;

/**
 * Story 1: 3-Column Emoji Option Tile Grid (Deepstash Screenshot 1)
 */
export const OptionTileGridStory: Story = {
  name: '1. 3-Column Emoji Tile Grid (Deepstash Inspiration)',
  render: () => {
    const [selected, setSelected] = useState<string[]>(['kanjeevaram', 'organza']);
    const theme = getSurveyTheme('ivory-editorial');

    const topics = [
      { id: 'kanjeevaram', label: 'Kanjeevaram', emoji: '👑', subtitle: 'Royal Silk' },
      { id: 'banarasi', label: 'Banarasi', emoji: '🌸', subtitle: 'Katan Brocade' },
      { id: 'organza', label: 'Tissue Organza', emoji: '✨', subtitle: 'Metallic Sheer' },
      { id: 'chanderi', label: 'Chanderi Zari', emoji: '🪡', subtitle: 'Lightweight' },
      { id: 'raw_silk', label: 'Raw Silk & Linen', emoji: '🌿', subtitle: 'Textured Slub' },
      { id: 'paithani', label: 'Paithani', emoji: '🦚', subtitle: 'Peacock Pallu' },
      { id: 'bridal', label: 'Bridal Lehengas', emoji: '💃', subtitle: 'Wedding Trousseau' },
      { id: 'fine_jewelry', label: 'Temple Zari', emoji: '💎', subtitle: 'Gold Threading' },
      { id: 'milestone', label: 'Festive Wear', emoji: '☀️', subtitle: 'Diwali & Celebrations' },
    ];

    return (
      <YStack width="100%" maxWidth={540} gap={16} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <Text color={theme.textHeading} fontSize={18} fontWeight="800" textAlign="center">
          Choose the topics you'd like to elevate
        </Text>
        <Text color={theme.textMuted} fontSize={13} textAlign="center">
          The choice won't limit your experience
        </Text>
        <OptionTileGrid
          options={topics}
          selectedIds={selected}
          onToggle={(id) =>
            setSelected((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          columns={3}
          theme={theme}
        />
      </YStack>
    );
  },
};

/**
 * Story 2: Likert 1-5 Scale Row (Deepstash Screenshot 2)
 */
export const LikertScaleStory: Story = {
  name: '2. 1-5 Agreement Scale (Deepstash Inspiration)',
  render: () => {
    const [rating, setRating] = useState<number>(3);
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack width="100%" maxWidth={540} gap={20} padding={24} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <Text color={theme.kickerColor} fontSize={12} fontWeight="800" letterSpacing={1.5} textTransform="uppercase" textAlign="center">
          PERSONALITY
        </Text>
        <Text color={theme.textHeading} fontSize={20} fontWeight="800" lineHeight={26} textAlign="center">
          Do you often feel left out of conversations because others seem to know more?
        </Text>

        <LikertScaleRow
          selectedValue={rating}
          onSelect={(val) => setRating(val)}
          minLabel="Don't agree"
          maxLabel="Agree"
          theme={theme}
        />
      </YStack>
    );
  },
};

/**
 * Story 3: Deepstash Segmented Milestone Progress Header
 */
export const SegmentedProgressHeaderStory: Story = {
  name: '3. Connected Segmented Progress Header',
  render: () => {
    const [milestone, setMilestone] = useState<number>(1);
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack width="100%" maxWidth={540} gap={20} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <DeepstashProgressHeader
          totalMilestones={4}
          currentMilestoneIndex={milestone}
          completedMilestones={Array.from({ length: milestone }, (_, i) => i)}
          canGoBack={milestone > 0}
          onBack={() => setMilestone((m) => Math.max(0, m - 1))}
          brandName="Vayyari"
          optionalHeading="VIP Taste Discovery"
          theme={theme}
          hasRewards={true}
          currentMudras={milestone * 175}
        />

        <XStack justifyContent="center" gap={10} marginTop={12}>
          <XStack
            cursor="pointer"
            backgroundColor={theme.primaryButtonBg}
            paddingHorizontal={14}
            paddingVertical={8}
            borderRadius={6}
            onPress={() => setMilestone((m) => Math.min(3, m + 1))}
          >
            <Text color={theme.primaryButtonText} fontSize={12} fontWeight="700">
              Next Milestone
            </Text>
          </XStack>
          <XStack
            cursor="pointer"
            backgroundColor={theme.secondaryButtonBg}
            borderColor={theme.secondaryButtonBorder}
            borderWidth={1}
            paddingHorizontal={14}
            paddingVertical={8}
            borderRadius={6}
            onPress={() => setMilestone((m) => Math.max(0, m - 1))}
          >
            <Text color={theme.secondaryButtonText} fontSize={12} fontWeight="600">
              Previous Milestone
            </Text>
          </XStack>
        </XStack>
      </YStack>
    );
  },
};

/**
 * Story 4: Multiple Choice Question (Single vs Multi-Select)
 */
export const MultipleChoiceStory: Story = {
  name: '4. Multiple Choice (Single & Multi-Select)',
  render: () => {
    const [singleSel, setSingleSel] = useState<string>('wedding');
    const [multiSel, setMultiSel] = useState<string[]>(['kanjeevaram', 'banarasi']);
    const theme = getSurveyTheme('ivory-editorial');

    const occasionOptions = [
      { id: 'wedding', label: 'Bridal Muhurtham & Trousseau', subtitle: 'Within next 30 to 60 days', badge: 'High Intent' },
      { id: 'festive', label: 'Festive Celebrations', subtitle: 'Diwali, Sankranti, Ugadi occasions' },
      { id: 'family_gifting', label: 'Prestige Family Gifting', subtitle: 'Heirloom gifts for milestones' },
      { id: 'wardrobe', label: 'Personal Connoisseur Wardrobe', subtitle: 'Everyday elegance & rare drapes' },
    ];

    const fabricOptions = [
      { id: 'kanjeevaram', label: 'Pure Kanjeevaram Silk', subtitle: 'Korvai double-warp with gold zari', badge: 'Popular' },
      { id: 'banarasi', label: 'Banarasi Katan Brocade', subtitle: 'Kadwa weave handwoven floral jaal' },
      { id: 'organza', label: 'Tissue Organza', subtitle: 'Metallic gossamer sheen & scalloped borders' },
      { id: 'raw_silk', label: 'Handspun Raw Silk & Linen', subtitle: 'Breathable texture with antique foil' },
    ];

    return (
      <YStack width="100%" maxWidth={540} gap={32} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <YStack gap={10}>
          <Text color={theme.textHeading} fontSize={18} fontWeight="800">
            A. Single-Select Multiple Choice
          </Text>
          <TypeformMultipleChoice
            questionNumber={1}
            title="What occasion are you dressing for?"
            description="Choose one key celebration to curate your debut collection."
            options={occasionOptions}
            selectedIds={[singleSel]}
            isMultiSelect={false}
            onSelect={(id) => setSingleSel(id)}
            theme={theme}
          />
        </YStack>

        <YStack gap={10}>
          <Text color={theme.textHeading} fontSize={18} fontWeight="800">
            B. Multi-Select Multiple Choice
          </Text>
          <TypeformMultipleChoice
            questionNumber={2}
            title="Which heritage fabrics speak to you?"
            description="Select all that apply to tailor your 700 Mudras rewards."
            options={fabricOptions}
            selectedIds={multiSel}
            isMultiSelect={true}
            onSelect={(id) =>
              setMultiSel((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            theme={theme}
          />
        </YStack>
      </YStack>
    );
  },
};

/**
 * Story 5: Text Input Question (Name, Phone & Error States)
 */
export const TextInputStory: Story = {
  name: '5. Text Input (Name, Phone & Error States)',
  render: () => {
    const [name, setName] = useState('Priya Sharma');
    const [phone, setPhone] = useState('9876543210');
    const [invalidPhone, setInvalidPhone] = useState('1234');
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack width="100%" maxWidth={540} gap={32} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <YStack gap={10}>
          <Text color={theme.textHeading} fontSize={16} fontWeight="700">
            A. Text Input: Name / Salutation
          </Text>
          <TypeformTextInput
            questionNumber={1}
            title="What name should appear on your Gold VIP Pass?"
            description="This will be personalized on your private debut access token."
            placeholder="Type your full name here..."
            value={name}
            onChange={(v) => setName(v)}
            theme={theme}
          />
        </YStack>

        <YStack gap={10}>
          <Text color={theme.textHeading} fontSize={16} fontWeight="700">
            B. Phone Input: With Country Code Prefix & Valid State
          </Text>
          <TypeformTextInput
            questionNumber={2}
            title="What is your WhatsApp mobile number?"
            description="Instant delivery of your VIP Pass and launch alerts."
            placeholder="10-digit mobile number"
            prefix="🇮🇳 +91"
            inputType="tel"
            value={phone}
            onChange={(v) => setPhone(v)}
            isValid={true}
            theme={theme}
          />
        </YStack>

        <YStack gap={10}>
          <Text color="#ef4444" fontSize={16} fontWeight="700">
            C. Phone Input: Validation Error State
          </Text>
          <TypeformTextInput
            questionNumber={3}
            title="Invalid phone demonstration"
            placeholder="10-digit number"
            prefix="🇮🇳 +91"
            inputType="tel"
            value={invalidPhone}
            onChange={(v) => setInvalidPhone(v)}
            validationError="Please enter a valid 10-digit Indian WhatsApp number"
            theme={theme}
          />
        </YStack>
      </YStack>
    );
  },
};

/**
 * Story 6: Gender / Collection Selection
 */
export const GenderSelectionStory: Story = {
  name: '6. Gender & Collection Selection',
  render: () => {
    const [selected, setSelected] = useState<string>('women');
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack width="100%" maxWidth={540} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <TypeformGenderSelection
          questionNumber={1}
          selectedId={selected}
          onSelect={(id) => setSelected(id)}
          theme={theme}
        />
      </YStack>
    );
  },
};

/**
 * Story 7: Fabric Swatch Cards - 7 Viswa States
 */
export const FabricSwatch7StatesStory: Story = {
  name: '7. Fabric Swatch Cards (7-State Validation)',
  render: () => {
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack width="100%" maxWidth={540} gap={24} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <Text color={theme.textHeading} fontSize={18} fontWeight="800">
          Viswa 7-State Verification for Fabric Swatch Cards
        </Text>

        <YStack gap={8}>
          <Text color={theme.textMuted} fontSize={12} fontWeight="700">
            STATE 1: DEFAULT / REST
          </Text>
          <FabricSwatchCard swatch={FABRIC_SWATCHES[0]} isSelected={false} language="en" uiState="rest" theme={theme} />
        </YStack>

        <YStack gap={8}>
          <Text color={theme.kickerColor} fontSize={12} fontWeight="700">
            STATE 2: HOVER / FOCUSED
          </Text>
          <FabricSwatchCard swatch={FABRIC_SWATCHES[1]} isSelected={false} language="en" uiState="focused" theme={theme} />
        </YStack>

        <YStack gap={8}>
          <Text color={theme.surfaceSelectedBorder} fontSize={12} fontWeight="700">
            STATE 3: ACTIVE / SELECTED
          </Text>
          <FabricSwatchCard swatch={FABRIC_SWATCHES[2]} isSelected={true} language="en" uiState="active" theme={theme} />
        </YStack>

        <YStack gap={8}>
          <Text color={theme.textMuted} fontSize={12} fontWeight="700">
            STATE 4: DISABLED
          </Text>
          <FabricSwatchCard swatch={FABRIC_SWATCHES[3]} isSelected={false} language="en" uiState="disabled" theme={theme} />
        </YStack>

        <YStack gap={8}>
          <Text color={theme.kickerColor} fontSize={12} fontWeight="700">
            STATE 5: LOADING / SKELETON SHIMMER
          </Text>
          <FabricSwatchCard swatch={FABRIC_SWATCHES[0]} isSelected={false} language="en" uiState="loading" theme={theme} />
        </YStack>

        <YStack gap={8}>
          <Text color="#ef4444" fontSize={12} fontWeight="700">
            STATE 6: ERROR / INVALID SELECTION
          </Text>
          <FabricSwatchCard swatch={FABRIC_SWATCHES[1]} isSelected={false} language="en" uiState="error" theme={theme} />
        </YStack>
      </YStack>
    );
  },
};

/**
 * Story 8: Gold Digital VIP Pass Card
 */
export const GoldVIPPassCardStory: Story = {
  name: '8. Gold Digital VIP Pass (Passport & Referral Share)',
  render: () => {
    const theme = getSurveyTheme('ivory-editorial');

    return (
      <YStack width="100%" maxWidth={540} alignItems="center" gap={16} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <YStack gap={4} alignItems="center">
          <Text color={theme.textHeading} fontSize={18} fontWeight="800">
            Gold Digital VIP Pass
          </Text>
          <Text color={theme.textMuted} fontSize={13} textAlign="center">
            Prestige VIP Passport & Mudras reward token presented upon survey completion.
          </Text>
        </YStack>
        <GoldVIPPassCard
          vipCode="VY-VIP-8821"
          memberName="Priya Sharma"
          earnedMudras={700}
          language="en"
          theme={theme}
        />
      </YStack>
    );
  },
};

/**
 * Story 9: Configurable Tiles (Emoji Customization & Image Area Selection Fill Modes)
 * Showcases:
 * 1. Emojis with custom color fill, background color, container border color, size
 * 2. Images with area selection fill modes: card-full (with gradient scrim), top-banner, thumbnail
 * 3. Title and subtitle at bottom
 * 4. Multi-select indicator and interactive toggle states
 */
export const ConfigurableTilesStory: Story = {
  name: '9. Configurable Tiles (Emoji & Image Area Fill Modes)',
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['kanjeevaram', 'img_full']);
    const theme = getSurveyTheme('ivory-editorial');

    const handleToggle = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    return (
      <YStack width="100%" maxWidth={560} gap={24} padding={20} backgroundColor={theme.backgroundColor} marginHorizontal="auto">
        <YStack gap={4}>
          <Text color={theme.textHeading} fontSize={18} fontWeight="800">
            Configurable Tile Component Variants
          </Text>
          <Text color={theme.textMuted} fontSize={13}>
            Demonstrating emoji color fill/background/borders & image area selection fill modes.
          </Text>
        </YStack>

        {/* Section A: Emoji Tiles with Custom Colors, Backgrounds & Borders */}
        <YStack gap={10}>
          <Text color={theme.kickerColor} fontSize={12} fontWeight="800" letterSpacing={1.2} textTransform="uppercase">
            A. Emoji Tiles (Fill Color, Background, Border & Subtitle)
          </Text>
          <YStack
            width="100%"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 6,
              width: '100%',
            }}
          >
            <ConfigurableTile
              id="kanjeevaram"
              title="Kanjeevaram"
              subtitle="Pure Mulberry Silk"
              media={{
                type: 'emoji',
                emoji: '👑',
                emojiColor: '#D4AF37',
                emojiBgColor: 'rgba(212, 175, 55, 0.14)',
                emojiBorderColor: 'rgba(212, 175, 55, 0.4)',
              }}
              isSelected={selectedIds.includes('kanjeevaram')}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
            />
            <ConfigurableTile
              id="banarasi"
              title="Banarasi"
              subtitle="Kadwa Floral Jaal"
              media={{
                type: 'emoji',
                emoji: '🌸',
                emojiColor: '#E05A47',
                emojiBgColor: 'rgba(224, 90, 71, 0.14)',
                emojiBorderColor: 'rgba(224, 90, 71, 0.4)',
              }}
              isSelected={selectedIds.includes('banarasi')}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
            />
            <ConfigurableTile
              id="organza"
              title="Organza"
              subtitle="Metallic Sheer Zari"
              media={{
                type: 'emoji',
                emoji: '✨',
                emojiColor: '#8B5CF6',
                emojiBgColor: 'rgba(139, 92, 246, 0.14)',
                emojiBorderColor: 'rgba(139, 92, 246, 0.4)',
              }}
              isSelected={selectedIds.includes('organza')}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
            />
          </YStack>
        </YStack>

        {/* Section B: Image Tiles with Area Selection Fill Modes */}
        <YStack gap={10}>
          <Text color={theme.kickerColor} fontSize={12} fontWeight="800" letterSpacing={1.2} textTransform="uppercase">
            B. Image Tiles (Area Selection: Card-Full, Top-Banner, Thumbnail)
          </Text>
          <YStack
            width="100%"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 6,
              width: '100%',
            }}
          >
            {/* Card-Full Area Fill */}
            <ConfigurableTile
              id="img_full"
              title="Kanjeevaram Gold"
              subtitle="Card-Full Area Fill"
              media={{
                type: 'image',
                imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
                imageFillMode: 'card-full',
              }}
              isSelected={selectedIds.includes('img_full')}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
              minHeight={110}
            />

            {/* Top-Banner Area Fill */}
            <ConfigurableTile
              id="img_banner"
              title="Banarasi Brocade"
              subtitle="Top Banner Mode"
              media={{
                type: 'image',
                imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80',
                imageFillMode: 'top-banner',
              }}
              isSelected={selectedIds.includes('img_banner')}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
              minHeight={110}
            />

            {/* Thumbnail Swatch Mode */}
            <ConfigurableTile
              id="img_thumb"
              title="Organza Weave"
              subtitle="Thumbnail Swatch"
              media={{
                type: 'image',
                imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80',
                imageFillMode: 'thumbnail',
              }}
              isSelected={selectedIds.includes('img_thumb')}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
              minHeight={110}
            />
          </YStack>
        </YStack>

        {/* Section C: Vayyari Dark Prelaunch Theme Preview */}
        <YStack gap={10}>
          <Text color={theme.kickerColor} fontSize={12} fontWeight="800" letterSpacing={1.2} textTransform="uppercase">
            C. Dark Luxury Theme Preview (Obsidian & Gold)
          </Text>
          {(() => {
            const darkTheme = getSurveyTheme('vayyari-dark');
            return (
              <XStack flexWrap="wrap" gap={10} justifyContent="space-between" padding={12} backgroundColor={darkTheme.backgroundColor} borderRadius={16}>
                <ConfigurableTile
                  id="dark_emoji"
                  title="Royal Kadwa"
                  subtitle="Gold Leaf Zari"
                  media={{
                    type: 'emoji',
                    emoji: '🪡',
                    emojiColor: '#ffd700',
                    emojiBgColor: 'rgba(212, 175, 55, 0.18)',
                    emojiBorderColor: 'rgba(212, 175, 55, 0.6)',
                  }}
                  isSelected={true}
                  onToggle={handleToggle}
                  theme={darkTheme}
                  width="48%"
                />
                <ConfigurableTile
                  id="dark_image"
                  title="Heritage Weave"
                  subtitle="Card-Full Scrim"
                  media={{
                    type: 'image',
                    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
                    imageFillMode: 'card-full',
                  }}
                  isSelected={false}
                  onToggle={handleToggle}
                  theme={darkTheme}
                  width="48%"
                  minHeight={100}
                />
              </XStack>
            );
          })()}
        </YStack>

        {/* Section D: Pure Vector Icons from Store & Admin Catalog */}
        <YStack gap={10}>
          <Text color={theme.kickerColor} fontSize={12} fontWeight="800" letterSpacing={1.2} textTransform="uppercase">
            D. Pure Vector Icon Tiles (Catalog Icons with Free-Space Scaling)
          </Text>
          <YStack
            width="100%"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 6,
              width: '100%',
            }}
          >
            <ConfigurableTile
              id="vector_crown"
              title="Kanjeevaram"
              subtitle="Multi Checkmark"
              media={{
                type: 'icon',
                icon: getVectorIcon('crown', 36),
              }}
              isSelected={selectedIds.includes('vector_crown')}
              isMultiSelect={true}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
            />
            <ConfigurableTile
              id="vector_sparkles"
              title="Banarasi"
              subtitle="Single Radio Dot"
              media={{
                type: 'icon',
                icon: getVectorIcon('sparkles', 36),
              }}
              isSelected={selectedIds.includes('vector_sparkles')}
              isMultiSelect={false}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
            />
            <ConfigurableTile
              id="vector_gem"
              title="Paithani"
              subtitle="Unselected Icon"
              media={{
                type: 'icon',
                icon: getVectorIcon('gem', 36),
              }}
              isSelected={false}
              onToggle={handleToggle}
              theme={theme}
              width="100%"
            />
          </YStack>
        </YStack>
      </YStack>
    );
  },
};

