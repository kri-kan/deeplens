import React, { useState } from 'react';
import { TextInput, Pressable, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RiWhatsappFill, RiInstagramFill } from 'react-icons/ri';
import { LuCopy, LuCheck, LuSparkles, LuPhone, LuTag } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { openPlatformHandle, formatDisplayHandle } from '../../../utils/platformLink';

export type GeneratorSource = 'whatsapp' | 'instagram' | null;
export type GeneratorPaymentMode = 'cod' | 'prepaid' | null;

export interface GeneratedOrderResult {
  id: string;
  source: GeneratorSource;
  paymentMode: GeneratorPaymentMode;
  timestamp: string | Date;
  sourceHandle?: string;
  isNew?: boolean;
}

export interface OrderIdGeneratorCardProps {
  selectedSource: GeneratorSource;
  onSelectSource: (source: GeneratorSource) => void;
  paymentMode: GeneratorPaymentMode;
  onSelectPaymentMode: (mode: GeneratorPaymentMode) => void;
  sourceHandle: string;
  onChangeSourceHandle: (val: string) => void;
  loading?: boolean;
  onGenerate: () => void;
  generatedEntry?: GeneratedOrderResult | null;
  onCopy?: (id: string, includePrefix?: boolean) => void;
  onOpenPlatform?: (source: string, handle?: string) => void;
}

const WHATSAPP_GREEN = '#25D366';
const INSTAGRAM_PINK = '#E1306C';

export function OrderIdGeneratorCard({
  selectedSource,
  onSelectSource,
  paymentMode,
  onSelectPaymentMode,
  sourceHandle,
  onChangeSourceHandle,
  loading = false,
  onGenerate,
  generatedEntry,
  onCopy,
  onOpenPlatform,
}: OrderIdGeneratorCardProps) {
  const { tokens } = useTheme();
  const [copiedType, setCopiedType] = useState<'raw' | 'prefix' | null>(null);

  const handleCopy = (includePrefix: boolean) => {
    if (!generatedEntry?.id) return;
    const type = includePrefix ? 'prefix' : 'raw';
    setCopiedType(type);
    if (onCopy) {
      onCopy(generatedEntry.id, includePrefix);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const text = includePrefix ? `order id # ${generatedEntry.id}` : generatedEntry.id;
      navigator.clipboard.writeText(text);
    }
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  const handleOpenPlatform = (source?: GeneratorSource, handle?: string) => {
    if (!source) return;
    if (onOpenPlatform) {
      onOpenPlatform(source, handle);
    } else {
      openPlatformHandle(source, handle);
    }
  };

  const isGenerateDisabled = () => {
    if (!selectedSource) return true;
    if (loading) return true;
    if (!sourceHandle || sourceHandle.trim().length === 0) return true;
    if (selectedSource === 'whatsapp') {
      const digits = sourceHandle.replace(/\D/g, '');
      if (digits.length < 10) return true;
    }
    return false;
  };

  const generatedDisplayHandle = generatedEntry
    ? formatDisplayHandle(generatedEntry.source, generatedEntry.sourceHandle)
    : '';

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.lg}
      borderWidth={1}
      borderColor={tokens.border}
      padding={16}
      gap={14}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.04}
      shadowRadius={8}
    >
      {/* Title & Badge */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={6}>
          <LuSparkles size={16} color={tokens.accent} />
          <Text fontSize={14} fontWeight="700" color={tokens.text}>
            Quick Order ID Generator
          </Text>
        </XStack>
        <Text fontSize={11} color={tokens.textMuted} fontWeight="500">
          Source & Payment Tagged
        </Text>
      </XStack>

      {/* Row: Source Platforms (Icon-Only Buttons) + Payment Mode Pills */}
      <XStack gap={10} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        {/* Source Icon-Only Buttons */}
        <XStack gap={10} alignItems="center">
          {/* WhatsApp Icon Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Select WhatsApp source"
            onPress={() => onSelectSource(selectedSource === 'whatsapp' ? null : 'whatsapp')}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={46}
              height={44}
              alignItems="center"
              justifyContent="center"
              borderRadius={tokens.radius.md}
              borderWidth={1.5}
              borderColor={selectedSource === 'whatsapp' ? WHATSAPP_GREEN : tokens.border}
              backgroundColor={
                selectedSource === 'whatsapp' ? `${WHATSAPP_GREEN}18` : tokens.surfaceRaised
              }
            >
              <RiWhatsappFill
                size={26}
                color={selectedSource === 'whatsapp' ? WHATSAPP_GREEN : tokens.textMuted}
              />
            </XStack>
          </TouchableOpacity>

          {/* Instagram Icon Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Select Instagram source"
            onPress={() => onSelectSource(selectedSource === 'instagram' ? null : 'instagram')}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={46}
              height={44}
              alignItems="center"
              justifyContent="center"
              borderRadius={tokens.radius.md}
              borderWidth={1.5}
              borderColor={selectedSource === 'instagram' ? INSTAGRAM_PINK : tokens.border}
              backgroundColor={
                selectedSource === 'instagram' ? `${INSTAGRAM_PINK}18` : tokens.surfaceRaised
              }
            >
              <RiInstagramFill
                size={26}
                color={selectedSource === 'instagram' ? INSTAGRAM_PINK : tokens.textMuted}
              />
            </XStack>
          </TouchableOpacity>
        </XStack>

        {/* Payment Pills: COD & Prepaid */}
        <XStack gap={8} alignItems="center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select COD payment mode"
            onPress={() => onSelectPaymentMode(paymentMode === 'cod' ? null : 'cod')}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingVertical={8}
              paddingHorizontal={14}
              borderRadius={tokens.radius.full}
              borderWidth={1}
              borderColor={paymentMode === 'cod' ? tokens.accent : tokens.border}
              backgroundColor={
                paymentMode === 'cod' ? tokens.accent : tokens.surfaceRaised
              }
            >
              <Text
                fontSize={12}
                fontWeight={paymentMode === 'cod' ? '700' : '500'}
                color={paymentMode === 'cod' ? tokens.surface : tokens.text}
              >
                COD
              </Text>
            </XStack>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Prepaid payment mode"
            onPress={() => onSelectPaymentMode(paymentMode === 'prepaid' ? null : 'prepaid')}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingVertical={8}
              paddingHorizontal={14}
              borderRadius={tokens.radius.full}
              borderWidth={1}
              borderColor={paymentMode === 'prepaid' ? tokens.accent : tokens.border}
              backgroundColor={
                paymentMode === 'prepaid' ? tokens.accent : tokens.surfaceRaised
              }
            >
              <Text
                fontSize={12}
                fontWeight={paymentMode === 'prepaid' ? '700' : '500'}
                color={paymentMode === 'prepaid' ? tokens.surface : tokens.text}
              >
                Prepaid
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Dynamic Source Input Field */}
      {selectedSource && (
        <YStack gap={4}>
          <XStack
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={tokens.radius.md}
            backgroundColor={tokens.background}
            paddingHorizontal={12}
            height={44}
            alignItems="center"
            gap={8}
          >
            {selectedSource === 'whatsapp' ? (
              <LuPhone size={16} color={WHATSAPP_GREEN} />
            ) : (
              <RiInstagramFill size={16} color={INSTAGRAM_PINK} />
            )}
            <TextInput
              accessibilityLabel={
                selectedSource === 'whatsapp'
                  ? 'Customer WhatsApp Phone Number'
                  : 'Customer Instagram Handle or URL'
              }
              value={sourceHandle}
              onChangeText={onChangeSourceHandle}
              placeholder={
                selectedSource === 'whatsapp'
                  ? 'Phone number (e.g. +91 98765 43210) *'
                  : 'Instagram handle (e.g. @username) *'
              }
              placeholderTextColor={tokens.textMuted}
              keyboardType={selectedSource === 'whatsapp' ? 'phone-pad' : 'default'}
              style={{
                flex: 1,
                fontSize: 13,
                color: tokens.text,
                outlineStyle: 'none',
              } as any}
            />
            {sourceHandle.length > 0 && (
              <Pressable
                onPress={() => onChangeSourceHandle('')}
                style={{ cursor: 'pointer' } as any}
              >
                <Text fontSize={12} color={tokens.textMuted}>
                  Clear
                </Text>
              </Pressable>
            )}
          </XStack>
          {selectedSource === 'whatsapp' && sourceHandle.replace(/\D/g, '').length < 10 && (
            <Text fontSize={11} color={tokens.textMuted} paddingLeft={4}>
              Enter at least 10 digits for phone lookup.
            </Text>
          )}
        </YStack>
      )}

      {/* Generate Action CTA */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Generate Order ID CTA"
        disabled={isGenerateDisabled()}
        onPress={onGenerate}
        style={{ opacity: isGenerateDisabled() ? 0.6 : 1, cursor: isGenerateDisabled() ? 'not-allowed' : 'pointer' } as any}
      >
        <XStack
          height={44}
          borderRadius={tokens.radius.md}
          backgroundColor={isGenerateDisabled() ? tokens.border : tokens.accent}
          alignItems="center"
          justifyContent="center"
          gap={8}
        >
          <Text
            fontSize={14}
            fontWeight="700"
            color={isGenerateDisabled() ? tokens.textMuted : tokens.surface}
          >
            {loading
              ? 'Generating ID...'
              : selectedSource
              ? 'Generate Order ID'
              : 'Select Platform to Begin'}
          </Text>
        </XStack>
      </Pressable>

      {/* Prominent Active / Generated ID Banner */}
      {generatedEntry && (
        <YStack
          backgroundColor={`${tokens.accent}0D`}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={`${tokens.accent}33`}
          padding={12}
          gap={10}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap={10} flex={1}>
              {/* Platform Circle Badge (Clickable Deep-Link) */}
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel={`Open ${generatedEntry.source} chat or profile`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => handleOpenPlatform(generatedEntry.source, generatedEntry.sourceHandle)}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack
                  width={36}
                  height={36}
                  borderRadius={tokens.radius.full}
                  backgroundColor={
                    generatedEntry.source === 'whatsapp'
                      ? `${WHATSAPP_GREEN}18`
                      : generatedEntry.source === 'instagram'
                      ? `${INSTAGRAM_PINK}18`
                      : `${tokens.accent}18`
                  }
                  alignItems="center"
                  justifyContent="center"
                >
                  {generatedEntry.source === 'whatsapp' ? (
                    <RiWhatsappFill size={20} color={WHATSAPP_GREEN} />
                  ) : generatedEntry.source === 'instagram' ? (
                    <RiInstagramFill size={20} color={INSTAGRAM_PINK} />
                  ) : (
                    <LuTag size={18} color={tokens.accent} />
                  )}
                </XStack>
              </TouchableOpacity>

              <YStack gap={1} flex={1}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={16} fontWeight="800" color={tokens.text} letterSpacing={0.5}>
                    #{generatedEntry.id}
                  </Text>
                  {generatedEntry.isNew && (
                    <XStack
                      backgroundColor={tokens.success}
                      paddingHorizontal={6}
                      paddingVertical={2}
                      borderRadius={tokens.radius.xs}
                    >
                      <Text fontSize={10} fontWeight="700" color="#fff">
                        NEW
                      </Text>
                    </XStack>
                  )}
                </XStack>
                <XStack alignItems="center" gap={6} flexWrap="wrap">
                  {generatedDisplayHandle ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${generatedDisplayHandle} on ${generatedEntry.source}`}
                      onPress={() => handleOpenPlatform(generatedEntry.source, generatedEntry.sourceHandle)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <Text
                        fontSize={11}
                        color={tokens.text}
                        fontWeight="600"
                        textDecorationLine="underline"
                        textDecorationColor={`${tokens.text}33`}
                      >
                        {generatedDisplayHandle}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {generatedDisplayHandle && (
                    <Text fontSize={10} color={tokens.textMuted}>
                      •
                    </Text>
                  )}
                  <Text fontSize={11} color={tokens.textMuted}>
                    {generatedEntry.paymentMode ? `${generatedEntry.paymentMode.toUpperCase()} • ` : ''}
                    {generatedEntry.isNew ? 'Generated just now' : 'Latest Generated ID'}
                  </Text>
                </XStack>
              </YStack>
            </XStack>

            {/* Action Buttons: Copy ID & Copy with Prefix */}
            <XStack gap={8} alignItems="center">
              {/* Copy Raw ID */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy raw order ID"
                onPress={() => handleCopy(false)}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack
                  alignItems="center"
                  gap={4}
                  paddingVertical={6}
                  paddingHorizontal={10}
                  borderRadius={tokens.radius.sm}
                  borderWidth={1}
                  borderColor={tokens.border}
                  backgroundColor={tokens.surface}
                >
                  {copiedType === 'raw' ? (
                    <LuCheck size={14} color={tokens.success} />
                  ) : (
                    <LuCopy size={14} color={tokens.accent} />
                  )}
                  <Text
                    fontSize={11}
                    fontWeight="600"
                    color={copiedType === 'raw' ? tokens.success : tokens.text}
                  >
                    {copiedType === 'raw' ? 'Copied' : 'Copy ID'}
                  </Text>
                </XStack>
              </Pressable>

              {/* Copy With Prefix */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy order ID with prefix"
                onPress={() => handleCopy(true)}
                style={{ cursor: 'pointer' } as any}
              >
                <XStack
                  alignItems="center"
                  gap={4}
                  paddingVertical={6}
                  paddingHorizontal={10}
                  borderRadius={tokens.radius.sm}
                  borderWidth={1}
                  borderColor={tokens.accent}
                  backgroundColor={tokens.surface}
                >
                  {copiedType === 'prefix' ? (
                    <LuCheck size={14} color={tokens.success} />
                  ) : (
                    <LuTag size={14} color={tokens.accent} />
                  )}
                  <Text
                    fontSize={11}
                    fontWeight="600"
                    color={copiedType === 'prefix' ? tokens.success : tokens.accent}
                  >
                    {copiedType === 'prefix' ? 'Copied #' : 'Copy # ID'}
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
