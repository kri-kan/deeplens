import React, { useState, useEffect, useCallback } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuX } from 'react-icons/lu';
import { SurveyPlayer, SurveyPlayerProps } from './SurveyPlayer';
import { SurveyVersionDto, SubmitSurveyResponseResult, SurveyFrameworkLanguage } from './surveySchema';

export interface UseSurveyTriggerOptions {
  surveySlug: string;
  originRoute: string;
  originTitle?: string;
  hiddenFields?: Record<string, string>;
  virtualUserId?: string;
  userId?: string | null;
  deviceId?: string;
  apiBaseUrl?: string;
  initialLanguage?: SurveyFrameworkLanguage;
  baseWalletBalance?: number;
  initialSchema?: SurveyVersionDto;
  onComplete?: (result: SubmitSurveyResponseResult) => void;
  onDismiss?: () => void;
}

export interface UseSurveyTriggerReturn {
  openSurvey: () => void;
  closeSurvey: () => void;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  schema: SurveyVersionDto | null;
  SurveyModal: React.FC;
}

export function useSurveyTrigger(options: UseSurveyTriggerOptions): UseSurveyTriggerReturn {
  const {
    surveySlug,
    originRoute,
    originTitle = 'Storefront',
    hiddenFields = {},
    virtualUserId = 'dev_device_fp_001',
    userId = null,
    deviceId = 'dev_browser_id',
    apiBaseUrl = 'http://localhost:5200',
    initialLanguage = 'en',
    baseWalletBalance = 0,
    initialSchema,
    onComplete,
    onDismiss,
  } = options;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SurveyVersionDto | null>(initialSchema || null);

  const fetchSchema = useCallback(async () => {
    if (schema) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/surveys/${surveySlug}`);
      if (!res.ok) {
        throw new Error(`Failed to load survey schema (${res.status})`);
      }
      const data: SurveyVersionDto = await res.json();
      setSchema(data);
    } catch (err: any) {
      console.error('Error fetching survey schema:', err);
      setError(err.message || 'Could not load survey.');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, surveySlug, schema]);

  const openSurvey = useCallback(() => {
    setIsOpen(true);
    if (!schema) {
      fetchSchema();
    }
  }, [schema, fetchSchema]);

  const closeSurvey = useCallback(() => {
    setIsOpen(false);
    if (onDismiss) onDismiss();
  }, [onDismiss]);

  const handleReturnToOrigin = useCallback(
    (result?: SubmitSurveyResponseResult) => {
      setIsOpen(false);
      if (result && onComplete) {
        onComplete(result);
      }
    },
    [onComplete]
  );

  const SurveyModal: React.FC = () => {
    if (!isOpen) return null;

    return (
      <YStack
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={9999}
        backgroundColor="rgba(10, 10, 10, 0.85)"
        style={{
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease-out',
        }}
        justifyContent="center"
        alignItems="center"
        padding={16}
      >
        <YStack
          width="100%"
          maxWidth={840}
          maxHeight="92vh"
          backgroundColor="#131418"
          borderRadius={24}
          overflow="hidden"
          position="relative"
          borderWidth={1}
          borderColor="rgba(212, 175, 55, 0.25)"
          style={{
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Modal Close / Dismiss Button in Top Right */}
          <XStack
            position="absolute"
            top={16}
            right={16}
            zIndex={100}
            cursor="pointer"
            padding={8}
            borderRadius={20}
            backgroundColor="rgba(255, 255, 255, 0.08)"
            hoverStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
            onPress={closeSurvey}
          >
            <LuX size={20} color="#e5e7eb" />
          </XStack>

          {/* Survey Player Body */}
          <YStack flex={1} overflow="scroll">
            {isLoading && (
              <YStack padding={60} alignItems="center" justifyContent="center">
                <Text color="#D4AF37" fontSize={16} fontWeight="600">
                  Loading Curated Experience...
                </Text>
              </YStack>
            )}

            {error && (
              <YStack padding={40} alignItems="center" gap={12}>
                <Text color="#ef4444" fontSize={16} fontWeight="600">
                  Unable to load survey
                </Text>
                <Text color="#9ca3af" fontSize={14}>
                  {error}
                </Text>
              </YStack>
            )}

            {schema && (
              <SurveyPlayer
                schema={schema}
                surveySlug={surveySlug}
                apiBaseUrl={apiBaseUrl}
                virtualUserId={virtualUserId}
                userId={userId}
                deviceId={deviceId}
                hiddenFieldValues={hiddenFields}
                originRoute={originRoute}
                originTitle={originTitle}
                initialLanguage={initialLanguage}
                baseWalletBalance={baseWalletBalance}
                onReturnToOrigin={handleReturnToOrigin}
                onSubmitComplete={onComplete}
              />
            )}
          </YStack>
        </YStack>
      </YStack>
    );
  };

  return {
    openSurvey,
    closeSurvey,
    isOpen,
    isLoading,
    error,
    schema,
    SurveyModal,
  };
}
