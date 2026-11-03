import React, { useState, useMemo } from 'react';
import { TextInput, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSurveyAdminTheme, surveyAdminStyles } from './surveyAdminTheme';
import { useResponsive } from '../../../theme';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import {
  LuSearch,
  LuX,
  LuLayers,
  LuCoins,
  LuGlobe,
  LuArrowLeft,
  LuEye,
  LuFileText,
  LuFlaskConical,
  LuCheck,
  LuCopy,
  LuExternalLink,
  LuFilter,
  LuCalendar,
  LuSparkles,
  LuImage,
} from 'react-icons/lu';
import {
  AdminSurveyResponseItem,
  AdminSurveyItem,
  AdminQuestionItem,
} from './surveyAdminTypes';
import {
  MOCK_ADMIN_RESPONSES,
  MOCK_ADMIN_SURVEYS,
  MOCK_ADMIN_QUESTIONS,
} from './surveyAdminMocks';

export interface AdminSurveyResponsesPageProps {
  responses?: AdminSurveyResponseItem[];
  surveys?: AdminSurveyItem[];
  questionsBank?: AdminQuestionItem[];
  initialSurveyId?: string;
  initialModeFilter?: 'all' | 'live' | 'sandbox';
  initialSearchQuery?: string;
  onNavigateBack?: () => void;
  onInspectResponse?: (response: AdminSurveyResponseItem) => void;
  disableSafeArea?: boolean;
}

export const AdminSurveyResponsesPage: React.FC<AdminSurveyResponsesPageProps> = ({
  responses: propResponses,
  surveys: propSurveys,
  questionsBank: propQuestionsBank,
  initialSurveyId = 'all',
  initialModeFilter = 'all',
  initialSearchQuery = '',
  onNavigateBack,
  onInspectResponse,
  disableSafeArea = false,
}) => {
  const theme = useSurveyAdminTheme();
  const { isMobile } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;
  const responsesList = useMemo(
    () => (propResponses && propResponses.length > 0 ? propResponses : MOCK_ADMIN_RESPONSES),
    [propResponses]
  );
  const surveysList = useMemo(
    () => (propSurveys && propSurveys.length > 0 ? propSurveys : MOCK_ADMIN_SURVEYS),
    [propSurveys]
  );
  const questionsList = useMemo(
    () => (propQuestionsBank && propQuestionsBank.length > 0 ? propQuestionsBank : MOCK_ADMIN_QUESTIONS),
    [propQuestionsBank]
  );

  // Filter & Search states
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(initialSurveyId);
  const [modeFilter, setModeFilter] = useState<'all' | 'live' | 'sandbox'>(initialModeFilter);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [routeFilter, setRouteFilter] = useState<string>('all');

  // Selected response for inspection modal
  const [inspectedResponse, setInspectedResponse] = useState<AdminSurveyResponseItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'answers' | 'hidden' | 'json'>('answers');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Available routes for filter pills
  const availableRoutes = useMemo(() => {
    const routes = new Set<string>();
    responsesList.forEach((r) => {
      if (r.originRoute) routes.add(r.originRoute);
    });
    return Array.from(routes);
  }, [responsesList]);

  // Filtered responses computation
  const filteredResponses = useMemo(() => {
    return responsesList.filter((resp) => {
      // Survey ID filter
      if (selectedSurveyId !== 'all' && resp.surveyId !== selectedSurveyId) {
        return false;
      }
      // Mode filter (Live vs Sandbox)
      if (modeFilter === 'live' && resp.isTest) return false;
      if (modeFilter === 'sandbox' && !resp.isTest) return false;

      // Origin Route filter
      if (routeFilter !== 'all' && resp.originRoute !== routeFilter) {
        return false;
      }

      // Search query (matches id, phone, userId, virtualUserId)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = resp.id.toLowerCase().includes(q);
        const matchesUser = resp.userId ? resp.userId.toLowerCase().includes(q) : false;
        const matchesVirtual = resp.virtualUserId.toLowerCase().includes(q);
        const matchesPhone = resp.phone ? resp.phone.toLowerCase().includes(q) : false;
        const matchesRoute = resp.originRoute ? resp.originRoute.toLowerCase().includes(q) : false;
        if (!matchesId && !matchesUser && !matchesVirtual && !matchesPhone && !matchesRoute) {
          return false;
        }
      }

      return true;
    });
  }, [responsesList, selectedSurveyId, modeFilter, routeFilter, searchQuery]);

  // Aggregated metrics
  const metrics = useMemo(() => {
    const total = responsesList.length;
    const liveCount = responsesList.filter((r) => !r.isTest).length;
    const sandboxCount = responsesList.filter((r) => r.isTest).length;
    const totalMudras = responsesList.reduce((acc, r) => acc + (r.earnedMudras || 0), 0);
    const avgMudras = total > 0 ? Math.round(totalMudras / total) : 0;
    return { total, liveCount, sandboxCount, totalMudras, avgMudras };
  }, [responsesList]);

  const handleCopyJson = () => {
    if (!inspectedResponse) return;
    try {
      navigator.clipboard?.writeText(JSON.stringify(inspectedResponse, null, 2));
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Fallback
    }
  };

  const questionMap = useMemo(() => {
    const map = new Map<string, AdminQuestionItem>();
    questionsList.forEach((q) => map.set(q.questionKey, q));
    return map;
  }, [questionsList]);

  return (
    <YStack flex={1} backgroundColor={theme.bg} minHeight="100vh">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & BREADCRUMBS                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      <YStack
        backgroundColor={theme.surface}
        borderBottomWidth={1}
        borderBottomColor="#1f2533"
        paddingHorizontal={28}
        paddingVertical={20}
        gap={12}
      >
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={16}>
          <XStack alignItems="center" gap={12}>
            {onNavigateBack && (
              <XStack
                cursor="pointer"
                padding={8}
                borderRadius={8}
                backgroundColor="rgba(255, 255, 255, 0.05)"
                hoverStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                onPress={onNavigateBack}
              >
                <LuArrowLeft size={18} color={theme.textMuted} />
              </XStack>
            )}
            <YStack>
              <XStack alignItems="center" gap={8}>
                <Text color={theme.textMuted} fontSize={13} fontWeight="500">
                  Survey Framework
                </Text>
                <Text color={theme.textMuted} fontSize={13}>
                  /
                </Text>
                <Text color={theme.accent} fontSize={13} fontWeight="600">
                  Submissions & Response Analytics
                </Text>
              </XStack>
              <Text color={theme.text} fontSize={24} fontWeight="800" letterSpacing={-0.5}>
                Response Visualizer & Submissions
              </Text>
            </YStack>
          </XStack>

          {/* Quick Metrics Pills */}
          <XStack alignItems="center" gap={10} flexWrap="wrap">
            <XStack
              backgroundColor={theme.surfaceRaised}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={10}
              borderWidth={1}
              borderColor={theme.border}
              alignItems="center"
              gap={8}
            >
              <LuFileText size={16} color="#60a5fa" />
              <Text color={theme.textMuted} fontSize={13}>
                Total:{' '}
                <Text color={theme.text} fontWeight="700">
                  {metrics.total}
                </Text>
              </Text>
            </XStack>

            <XStack
              backgroundColor={theme.surfaceRaised}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={10}
              borderWidth={1}
              borderColor={theme.border}
              alignItems="center"
              gap={8}
            >
              <LuCheck size={16} color="#10b981" />
              <Text color={theme.textMuted} fontSize={13}>
                Live:{' '}
                <Text color="#10b981" fontWeight="700">
                  {metrics.liveCount}
                </Text>
              </Text>
            </XStack>

            <XStack
              backgroundColor={theme.surfaceRaised}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={10}
              borderWidth={1}
              borderColor={theme.border}
              alignItems="center"
              gap={8}
            >
              <LuFlaskConical size={16} color="#f59e0b" />
              <Text color={theme.textMuted} fontSize={13}>
                Sandbox:{' '}
                <Text color="#f59e0b" fontWeight="700">
                  {metrics.sandboxCount}
                </Text>
              </Text>
            </XStack>

            <XStack
              backgroundColor={theme.surfaceRaised}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={10}
              borderWidth={1}
              borderColor={theme.accent}
              alignItems="center"
              gap={8}
            >
              <LuCoins size={16} color={theme.accent} />
              <Text color={theme.textMuted} fontSize={13}>
                Avg Reward:{' '}
                <Text color={theme.accent} fontWeight="700">
                  +{metrics.avgMudras} Mudras
                </Text>
              </Text>
            </XStack>
          </XStack>
        </XStack>

        {/* Filter Controls Toolbar */}
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={14} marginTop={8}>
          {/* Left: Survey Selector & Mode Tabs */}
          <XStack alignItems="center" gap={12} flexWrap="wrap">
            {/* Survey Filter Dropdown Pills */}
            <XStack backgroundColor={theme.surfaceRaised} borderRadius={8} padding={3} borderWidth={1} borderColor={theme.border}>
              <XStack
                cursor="pointer"
                paddingHorizontal={12}
                paddingVertical={6}
                borderRadius={6}
                backgroundColor={selectedSurveyId === 'all' ? '#D4AF37' : 'transparent'}
                onPress={() => setSelectedSurveyId('all')}
              >
                <Text
                  color={selectedSurveyId === 'all' ? '#000000' : '#9ca3af'}
                  fontSize={12}
                  fontWeight="600"
                >
                  All Surveys
                </Text>
              </XStack>
              {surveysList.map((s) => (
                <XStack
                  key={s.id}
                  cursor="pointer"
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderRadius={6}
                  backgroundColor={selectedSurveyId === s.id ? '#D4AF37' : 'transparent'}
                  onPress={() => setSelectedSurveyId(s.id)}
                >
                  <Text
                    color={selectedSurveyId === s.id ? '#000000' : '#9ca3af'}
                    fontSize={12}
                    fontWeight="600"
                  >
                    {s.title}
                  </Text>
                </XStack>
              ))}
            </XStack>

            {/* Mode Switcher (Live vs Sandbox) */}
            <XStack backgroundColor={theme.surfaceRaised} borderRadius={8} padding={3} borderWidth={1} borderColor={theme.border}>
              <XStack
                cursor="pointer"
                paddingHorizontal={12}
                paddingVertical={6}
                borderRadius={6}
                backgroundColor={modeFilter === 'all' ? '#252a36' : 'transparent'}
                onPress={() => setModeFilter('all')}
              >
                <Text color={modeFilter === 'all' ? '#f9fafb' : '#9ca3af'} fontSize={12} fontWeight="600">
                  All Modes
                </Text>
              </XStack>
              <XStack
                cursor="pointer"
                paddingHorizontal={12}
                paddingVertical={6}
                borderRadius={6}
                backgroundColor={modeFilter === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'transparent'}
                borderWidth={modeFilter === 'live' ? 1 : 0}
                borderColor="#10b981"
                onPress={() => setModeFilter('live')}
                gap={6}
                alignItems="center"
              >
                <LuCheck size={13} color="#10b981" />
                <Text color={modeFilter === 'live' ? '#10b981' : '#9ca3af'} fontSize={12} fontWeight="600">
                  Live
                </Text>
              </XStack>
              <XStack
                cursor="pointer"
                paddingHorizontal={12}
                paddingVertical={6}
                borderRadius={6}
                backgroundColor={modeFilter === 'sandbox' ? 'rgba(245, 158, 11, 0.2)' : 'transparent'}
                borderWidth={modeFilter === 'sandbox' ? 1 : 0}
                borderColor="#f59e0b"
                onPress={() => setModeFilter('sandbox')}
                gap={6}
                alignItems="center"
              >
                <LuFlaskConical size={13} color="#f59e0b" />
                <Text color={modeFilter === 'sandbox' ? '#f59e0b' : '#9ca3af'} fontSize={12} fontWeight="600">
                  Sandbox
                </Text>
              </XStack>
            </XStack>
          </XStack>

          {/* Right: Search Input */}
          <XStack
            alignItems="center"
            backgroundColor={theme.surfaceRaised}
            borderRadius={10}
            borderWidth={1}
            borderColor={theme.border}
            paddingHorizontal={14}
            width={320}
            gap={10}
          >
            <LuSearch size={16} color={theme.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search response ID, user, phone..."
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <XStack cursor="pointer" onPress={() => setSearchQuery('')}>
                <LuX size={15} color={theme.textMuted} />
              </XStack>
            )}
          </XStack>
        </XStack>

        {/* Origin Route Pills */}
        {availableRoutes.length > 0 && (
          <XStack alignItems="center" gap={8} marginTop={4} flexWrap="wrap">
            <Text color={theme.textMuted} fontSize={12} fontWeight="500">
              Origin Route:
            </Text>
            <XStack
              cursor="pointer"
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={6}
              backgroundColor={routeFilter === 'all' ? '#252a36' : 'transparent'}
              borderWidth={1}
              borderColor={routeFilter === 'all' ? '#3b82f6' : '#1f2533'}
              onPress={() => setRouteFilter('all')}
            >
              <Text color={routeFilter === 'all' ? '#93c5fd' : '#9ca3af'} fontSize={11} fontWeight="500">
                All Routes ({responsesList.length})
              </Text>
            </XStack>
            {availableRoutes.map((route) => {
              const count = responsesList.filter((r) => r.originRoute === route).length;
              const isSelected = routeFilter === route;
              return (
                <XStack
                  key={route}
                  cursor="pointer"
                  paddingHorizontal={10}
                  paddingVertical={4}
                  borderRadius={6}
                  backgroundColor={isSelected ? '#252a36' : 'transparent'}
                  borderWidth={1}
                  borderColor={isSelected ? '#3b82f6' : '#1f2533'}
                  onPress={() => setRouteFilter(route)}
                >
                  <Text color={isSelected ? '#93c5fd' : '#9ca3af'} fontSize={11} fontWeight="500">
                    {route} ({count})
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        )}
      </YStack>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. SUBMISSIONS TABLE / DATA GRID                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      <YStack flex={1} padding={28}>
        {filteredResponses.length === 0 ? (
          <YStack
            backgroundColor={theme.surface}
            borderRadius={14}
            borderWidth={1}
            borderColor={theme.border}
            padding={60}
            alignItems="center"
            justifyContent="center"
            gap={14}
          >
            <LuFileText size={48} color={theme.textMuted} />
            <Text color={theme.text} fontSize={18} fontWeight="700">
              No Submissions Found
            </Text>
            <Text color={theme.textMuted} fontSize={14} textAlign="center" maxWidth={420}>
              No survey response records match the active filters. Try switching modes or clearing your search query.
            </Text>
          </YStack>
        ) : (
          <YStack
            backgroundColor={theme.surface}
            borderRadius={14}
            borderWidth={1}
            borderColor={theme.border}
            overflow="hidden"
          >
            {/* Table Header */}
            <XStack
              backgroundColor={theme.surfaceRaised}
              paddingHorizontal={20}
              paddingVertical={14}
              borderBottomWidth={1}
              borderBottomColor="#1f2533"
              alignItems="center"
            >
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" width={180}>
                SUBMISSION ID / MODE
              </Text>
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" width={160}>
                SURVEY / VER
              </Text>
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" flex={1}>
                CUSTOMER IDENTITY
              </Text>
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" width={100}>
                LANG
              </Text>
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" width={130}>
                REWARD
              </Text>
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" width={150}>
                TIMESTAMP
              </Text>
              <Text color={theme.textMuted} fontSize={12} fontWeight="700" width={90} textAlign="right">
                ACTION
              </Text>
            </XStack>

            {/* Table Rows */}
            <ScrollView maxHeight="65vh">
              {filteredResponses.map((resp, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <XStack
                    key={resp.id}
                    backgroundColor={isEven ? '#12151c' : '#141820'}
                    paddingHorizontal={20}
                    paddingVertical={14}
                    borderBottomWidth={1}
                    borderBottomColor="#1c212c"
                    alignItems="center"
                    hoverStyle={{ backgroundColor: '#1a1f2c' }}
                  >
                    {/* Submission ID & Mode Badge */}
                    <YStack width={180} gap={4}>
                      <Text color={theme.text} fontSize={13} fontWeight="600" fontFamily="monospace">
                        {resp.id}
                      </Text>
                      <XStack alignItems="center" gap={6}>
                        {resp.isTest ? (
                          <XStack
                            backgroundColor="rgba(245, 158, 11, 0.15)"
                            paddingHorizontal={6}
                            paddingVertical={2}
                            borderRadius={4}
                            borderWidth={1}
                            borderColor="rgba(245, 158, 11, 0.4)"
                            alignItems="center"
                            gap={4}
                          >
                            <LuFlaskConical size={11} color="#f59e0b" />
                            <Text color="#f59e0b" fontSize={10} fontWeight="700">
                              SANDBOX
                            </Text>
                          </XStack>
                        ) : (
                          <XStack
                            backgroundColor="rgba(16, 185, 129, 0.15)"
                            paddingHorizontal={6}
                            paddingVertical={2}
                            borderRadius={4}
                            borderWidth={1}
                            borderColor="rgba(16, 185, 129, 0.4)"
                            alignItems="center"
                            gap={4}
                          >
                            <LuCheck size={11} color="#10b981" />
                            <Text color="#10b981" fontSize={10} fontWeight="700">
                              LIVE
                            </Text>
                          </XStack>
                        )}
                        <Text color={theme.textMuted} fontSize={11}>
                          {resp.originRoute || 'direct'}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Survey & Version */}
                    <YStack width={160} gap={4}>
                      <Text color={theme.textSecondary} fontSize={13} fontWeight="600">
                        /{resp.surveySlug}
                      </Text>
                      <XStack alignItems="center" gap={4}>
                        <Text color={theme.accent} fontSize={11} fontWeight="700">
                          v{resp.versionNumber}
                        </Text>
                        <Text color={theme.textMuted} fontSize={11}>
                          •
                        </Text>
                        <Text color={theme.textMuted} fontSize={11}>
                          {resp.questionsAnsweredCount} answers
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Customer Identity */}
                    <YStack flex={1} gap={3} paddingRight={12}>
                      <XStack alignItems="center" gap={8}>
                        <Text color={theme.text} fontSize={13} fontWeight="500">
                          {resp.phone || resp.userId || 'Guest Shopper'}
                        </Text>
                        {resp.userId && (
                          <Text color="#93c5fd" fontSize={11} fontFamily="monospace">
                            ({resp.userId})
                          </Text>
                        )}
                      </XStack>
                      <Text color={theme.textMuted} fontSize={11} fontFamily="monospace" numberOfLines={1}>
                        FP: {resp.virtualUserId}
                      </Text>
                    </YStack>

                    {/* Language */}
                    <YStack width={100}>
                      <XStack
                        backgroundColor={theme.surfaceRaised}
                        paddingHorizontal={8}
                        paddingVertical={3}
                        borderRadius={6}
                        borderWidth={1}
                        borderColor={theme.border}
                        alignSelf="flex-start"
                        alignItems="center"
                        gap={4}
                      >
                        <LuGlobe size={12} color={theme.textMuted} />
                        <Text color={theme.text} fontSize={11} fontWeight="600">
                          {resp.language.toUpperCase()}
                        </Text>
                      </XStack>
                    </YStack>

                    {/* Mudras Reward */}
                    <YStack width={130} gap={2}>
                      <XStack alignItems="center" gap={6}>
                        <LuCoins size={15} color={theme.accent} />
                        <Text color={theme.accent} fontSize={14} fontWeight="800">
                          +{resp.earnedMudras}
                        </Text>
                      </XStack>
                      <Text color={theme.textMuted} fontSize={10}>
                        Mudras credited
                      </Text>
                    </YStack>

                    {/* Timestamp */}
                    <YStack width={150} gap={2}>
                      <Text color={theme.textMuted} fontSize={12}>
                        {new Date(resp.submittedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text color={theme.textMuted} fontSize={11}>
                        {new Date(resp.submittedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </YStack>

                    {/* Action Button */}
                    <XStack width={90} justifyContent="flex-end">
                      <XStack
                        cursor="pointer"
                        backgroundColor="#1f2533"
                        hoverStyle={{ backgroundColor: '#2b3242' }}
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={8}
                        alignItems="center"
                        gap={6}
                        onPress={() => {
                          setInspectedResponse(resp);
                          setInspectorTab('answers');
                          if (onInspectResponse) onInspectResponse(resp);
                        }}
                      >
                        <LuEye size={14} color={theme.accent} />
                        <Text color={theme.text} fontSize={12} fontWeight="600">
                          View
                        </Text>
                      </XStack>
                    </XStack>
                  </XStack>
                );
              })}
            </ScrollView>
          </YStack>
        )}
      </YStack>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. SUBMISSION DETAIL INSPECTOR MODAL                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {inspectedResponse && (
        <Modal
          visible={Boolean(inspectedResponse)}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectedResponse(null)}
        >
          <YStack
            flex={1}
            backgroundColor={theme.overlay}
            justifyContent="center"
            alignItems="center"
            padding={24}
          >
            <YStack
              width="100%"
              maxWidth={880}
              maxHeight="90vh"
              backgroundColor={theme.surface}
              borderRadius={18}
              borderWidth={1}
              borderColor={theme.border}
              overflow="hidden"
            >
              {/* Modal Header */}
              <XStack
                paddingHorizontal={24}
                paddingVertical={18}
                borderBottomWidth={1}
                borderBottomColor="#1f2533"
                justifyContent="space-between"
                alignItems="center"
                backgroundColor={theme.surfaceRaised}
              >
                <XStack alignItems="center" gap={12}>
                  <YStack>
                    <XStack alignItems="center" gap={8}>
                      <Text color={theme.accent} fontSize={12} fontWeight="700" letterSpacing={0.5}>
                        RESPONSE INSPECTOR
                      </Text>
                      {inspectedResponse.isTest ? (
                        <XStack
                          backgroundColor="rgba(245, 158, 11, 0.2)"
                          paddingHorizontal={8}
                          paddingVertical={2}
                          borderRadius={4}
                          borderWidth={1}
                          borderColor="#f59e0b"
                        >
                          <Text color="#f59e0b" fontSize={10} fontWeight="700">
                            SANDBOX TEST RUN
                          </Text>
                        </XStack>
                      ) : (
                        <XStack
                          backgroundColor="rgba(16, 185, 129, 0.2)"
                          paddingHorizontal={8}
                          paddingVertical={2}
                          borderRadius={4}
                          borderWidth={1}
                          borderColor="#10b981"
                        >
                          <Text color="#10b981" fontSize={10} fontWeight="700">
                            LIVE SUBMISSION
                          </Text>
                        </XStack>
                      )}
                    </XStack>
                    <Text color={theme.text} fontSize={18} fontWeight="700" fontFamily="monospace">
                      {inspectedResponse.id}
                    </Text>
                  </YStack>
                </XStack>

                <XStack
                  cursor="pointer"
                  padding={8}
                  borderRadius={8}
                  backgroundColor="#1f2533"
                  hoverStyle={{ backgroundColor: '#2b3242' }}
                  onPress={() => setInspectedResponse(null)}
                >
                  <LuX size={18} color={theme.textMuted} />
                </XStack>
              </XStack>

              {/* Inspector Meta Bar */}
              <XStack
                backgroundColor={theme.surfaceRaised}
                paddingHorizontal={24}
                paddingVertical={12}
                borderBottomWidth={1}
                borderBottomColor="#1f2533"
                gap={24}
                flexWrap="wrap"
              >
                <YStack gap={2}>
                  <Text color={theme.textMuted} fontSize={11}>
                    SURVEY SLUG
                  </Text>
                  <Text color={theme.text} fontSize={13} fontWeight="600">
                    /{inspectedResponse.surveySlug} (v{inspectedResponse.versionNumber})
                  </Text>
                </YStack>
                <YStack gap={2}>
                  <Text color={theme.textMuted} fontSize={11}>
                    CUSTOMER
                  </Text>
                  <Text color={theme.text} fontSize={13} fontWeight="600">
                    {inspectedResponse.phone || inspectedResponse.userId || 'Guest'}
                  </Text>
                </YStack>
                <YStack gap={2}>
                  <Text color={theme.textMuted} fontSize={11}>
                    LANGUAGE
                  </Text>
                  <Text color={theme.text} fontSize={13} fontWeight="600">
                    {inspectedResponse.language.toUpperCase()}
                  </Text>
                </YStack>
                <YStack gap={2}>
                  <Text color={theme.textMuted} fontSize={11}>
                    MUDRAS EARNED
                  </Text>
                  <Text color={theme.accent} fontSize={13} fontWeight="800">
                    +{inspectedResponse.earnedMudras} Mudras
                  </Text>
                </YStack>
                <YStack gap={2}>
                  <Text color={theme.textMuted} fontSize={11}>
                    SUBMITTED AT
                  </Text>
                  <Text color={theme.textMuted} fontSize={13}>
                    {new Date(inspectedResponse.submittedAt).toLocaleString('en-IN')}
                  </Text>
                </YStack>
              </XStack>

              {/* Inspector Tab Switcher */}
              <XStack
                backgroundColor={theme.surface}
                paddingHorizontal={24}
                paddingTop={12}
                borderBottomWidth={1}
                borderBottomColor="#1f2533"
                gap={16}
              >
                <XStack
                  cursor="pointer"
                  paddingBottom={12}
                  borderBottomWidth={2}
                  borderBottomColor={inspectorTab === 'answers' ? '#D4AF37' : 'transparent'}
                  onPress={() => setInspectorTab('answers')}
                  alignItems="center"
                  gap={8}
                >
                  <LuCheck size={15} color={inspectorTab === 'answers' ? '#D4AF37' : '#6b7280'} />
                  <Text
                    color={inspectorTab === 'answers' ? '#f9fafb' : '#6b7280'}
                    fontSize={13}
                    fontWeight="600"
                  >
                    Question Answers ({Object.keys(inspectedResponse.answers || {}).length})
                  </Text>
                </XStack>

                <XStack
                  cursor="pointer"
                  paddingBottom={12}
                  borderBottomWidth={2}
                  borderBottomColor={inspectorTab === 'hidden' ? '#D4AF37' : 'transparent'}
                  onPress={() => setInspectorTab('hidden')}
                  alignItems="center"
                  gap={8}
                >
                  <LuFlaskConical size={15} color={inspectorTab === 'hidden' ? '#D4AF37' : '#6b7280'} />
                  <Text
                    color={inspectorTab === 'hidden' ? '#f9fafb' : '#6b7280'}
                    fontSize={13}
                    fontWeight="600"
                  >
                    Hidden URL Context ({Object.keys(inspectedResponse.hiddenFields || {}).length})
                  </Text>
                </XStack>

                <XStack
                  cursor="pointer"
                  paddingBottom={12}
                  borderBottomWidth={2}
                  borderBottomColor={inspectorTab === 'json' ? '#D4AF37' : 'transparent'}
                  onPress={() => setInspectorTab('json')}
                  alignItems="center"
                  gap={8}
                >
                  <LuFileText size={15} color={inspectorTab === 'json' ? '#D4AF37' : '#6b7280'} />
                  <Text
                    color={inspectorTab === 'json' ? '#f9fafb' : '#6b7280'}
                    fontSize={13}
                    fontWeight="600"
                  >
                    Raw JSON Payload
                  </Text>
                </XStack>
              </XStack>

              {/* Inspector Content */}
              <ScrollView maxHeight="55vh" padding={24}>
                {/* TAB 1: ANSWERS BREAKDOWN */}
                {inspectorTab === 'answers' && (
                  <YStack gap={14}>
                    {Object.entries(inspectedResponse.answers || {}).map(([key, val]) => {
                      const question = questionMap.get(key);
                      const title = question?.statements?.title?.en || key;
                      const isImageUpload =
                        typeof val === 'string' &&
                        (val.startsWith('http') || val.includes('.jpg') || val.includes('.png'));

                      return (
                        <YStack
                          key={key}
                          backgroundColor={theme.surfaceRaised}
                          borderRadius={12}
                          borderWidth={1}
                          borderColor={theme.border}
                          padding={16}
                          gap={8}
                        >
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text color={theme.accent} fontSize={11} fontWeight="700" fontFamily="monospace">
                              {key}
                            </Text>
                            {question && (
                              <XStack
                                backgroundColor="#1f2533"
                                paddingHorizontal={8}
                                paddingVertical={2}
                                borderRadius={4}
                              >
                                <Text color={theme.textMuted} fontSize={10} fontWeight="600">
                                  {question.questionType}
                                </Text>
                              </XStack>
                            )}
                          </XStack>

                          <Text color={theme.text} fontSize={14} fontWeight="600">
                            {title}
                          </Text>

                          {/* Render Answer Value */}
                          {isImageUpload ? (
                            <XStack
                              backgroundColor={theme.surface}
                              borderRadius={8}
                              padding={12}
                              borderWidth={1}
                              borderColor={theme.border}
                              alignItems="center"
                              justifyContent="space-between"
                              gap={12}
                            >
                              <XStack alignItems="center" gap={10}>
                                <LuImage size={24} color="#60a5fa" />
                                <YStack>
                                  <Text color={theme.text} fontSize={13} fontWeight="600">
                                    Customer Photo Upload
                                  </Text>
                                  <Text color={theme.textMuted} fontSize={11} fontFamily="monospace" numberOfLines={1}>
                                    {val}
                                  </Text>
                                </YStack>
                              </XStack>
                              <XStack
                                cursor="pointer"
                                paddingHorizontal={12}
                                paddingVertical={6}
                                backgroundColor="#1f2533"
                                hoverStyle={{ backgroundColor: '#2b3242' }}
                                borderRadius={6}
                                alignItems="center"
                                gap={6}
                              >
                                <LuExternalLink size={13} color={theme.accent} />
                                <Text color={theme.accent} fontSize={12} fontWeight="600">
                                  Presigned View
                                </Text>
                              </XStack>
                            </XStack>
                          ) : Array.isArray(val) ? (
                            <XStack gap={8} flexWrap="wrap">
                              {val.map((item, i) => (
                                <XStack
                                  key={i}
                                  backgroundColor="#1f2533"
                                  paddingHorizontal={10}
                                  paddingVertical={4}
                                  borderRadius={6}
                                  borderWidth={1}
                                  borderColor={theme.accent}
                                >
                                  <Text color={theme.accent} fontSize={12} fontWeight="600">
                                    {String(item)}
                                  </Text>
                                </XStack>
                              ))}
                            </XStack>
                          ) : (
                            <Text color="#93c5fd" fontSize={14} fontWeight="600">
                              {String(val)}
                            </Text>
                          )}
                        </YStack>
                      );
                    })}
                  </YStack>
                )}

                {/* TAB 2: HIDDEN CONTEXT FIELDS */}
                {inspectorTab === 'hidden' && (
                  <YStack gap={14}>
                    <Text color={theme.textMuted} fontSize={13}>
                      These contextual fields were automatically resolved from URL parameters or fallback static defaults without showing in client UI:
                    </Text>

                    {Object.keys(inspectedResponse.hiddenFields || {}).length === 0 ? (
                      <YStack
                        backgroundColor={theme.surfaceRaised}
                        padding={32}
                        borderRadius={10}
                        alignItems="center"
                        gap={8}
                      >
                        <Text color={theme.textMuted} fontSize={13}>
                          No hidden parameters were captured for this submission.
                        </Text>
                      </YStack>
                    ) : (
                      <YStack
                        backgroundColor={theme.surfaceRaised}
                        borderRadius={12}
                        borderWidth={1}
                        borderColor={theme.border}
                        overflow="hidden"
                      >
                        {Object.entries(inspectedResponse.hiddenFields || {}).map(([param, val], idx) => {
                          const isEven = idx % 2 === 0;
                          return (
                            <XStack
                              key={param}
                              backgroundColor={isEven ? '#171b24' : '#141820'}
                              paddingHorizontal={20}
                              paddingVertical={12}
                              borderBottomWidth={1}
                              borderBottomColor="#1f2533"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <XStack alignItems="center" gap={10}>
                                <Text color={theme.accent} fontSize={13} fontWeight="700" fontFamily="monospace">
                                  ?{param}=
                                </Text>
                              </XStack>
                              <Text color="#93c5fd" fontSize={13} fontWeight="600" fontFamily="monospace">
                                {String(val)}
                              </Text>
                            </XStack>
                          );
                        })}
                      </YStack>
                    )}
                  </YStack>
                )}

                {/* TAB 3: RAW JSON */}
                {inspectorTab === 'json' && (
                  <YStack gap={12}>
                    <XStack justifyContent="flex-end">
                      <XStack
                        cursor="pointer"
                        backgroundColor="#1f2533"
                        hoverStyle={{ backgroundColor: '#2b3242' }}
                        paddingHorizontal={12}
                        paddingVertical={6}
                        borderRadius={6}
                        alignItems="center"
                        gap={6}
                        onPress={handleCopyJson}
                      >
                        <LuCopy size={13} color={copyFeedback ? '#10b981' : '#9ca3af'} />
                        <Text color={copyFeedback ? '#10b981' : '#9ca3af'} fontSize={12} fontWeight="600">
                          {copyFeedback ? 'Copied!' : 'Copy JSON'}
                        </Text>
                      </XStack>
                    </XStack>
                    <YStack
                      backgroundColor={theme.surfaceRaised}
                      padding={16}
                      borderRadius={10}
                      borderWidth={1}
                      borderColor={theme.border}
                    >
                      <Text color="#a5b4fc" fontSize={12} fontFamily="monospace" style={{ whiteSpace: 'pre' }}>
                        {JSON.stringify(inspectedResponse, null, 2)}
                      </Text>
                    </YStack>
                  </YStack>
                )}
              </ScrollView>
            </YStack>
          </YStack>
        </Modal>
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    height: 38,
    color: '#f9fafb',
    fontSize: 13,
    outlineWidth: 0,
    backgroundColor: 'transparent',
  },
});
