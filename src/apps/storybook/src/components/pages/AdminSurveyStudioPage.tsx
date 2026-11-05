import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import {
  LuPlus,
  LuSparkles,
  LuLayers,
  LuSend,
  LuFileText,
  LuUsers,
  LuSmartphone,
  LuCoins,
  LuCheck,
  LuEye,
  LuHistory,
  LuGlobe,
  LuTag,
  LuArrowRight,
  LuArchive,
  LuRefreshCw,
  LuChevronRight,
  LuX,
  LuClock,
} from 'react-icons/lu';
import { getVectorIcon } from '../atoms/SurveyOptionTile';

export interface AdminSurveyItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  audienceType: string;
  defaultLanguage: string;
  hasUncommittedDraft: boolean;
  latestVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSurveyResponseItem {
  id: string;
  surveyId: string;
  versionNumber: number;
  userId?: string | null;
  virtualUserId: string;
  phone?: string | null;
  language: string;
  questionsAnsweredCount: number;
  earnedMudras: number;
  originRoute?: string | null;
  submittedAt: string;
  answers?: Record<string, any>;
  hiddenFields?: Record<string, string>;
}

export interface AdminSurveyStudioPageProps {
  apiBaseUrl?: string;
  initialSurveyId?: string;
}

export const AdminSurveyStudioPage: React.FC<AdminSurveyStudioPageProps> = ({
  apiBaseUrl = 'http://localhost:5200',
  initialSurveyId,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'questions' | 'responses'>('catalog');
  const [surveys, setSurveys] = useState<AdminSurveyItem[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<AdminSurveyItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [surveyDetail, setSurveyDetail] = useState<any | null>(null);
  const [responses, setResponses] = useState<AdminSurveyResponseItem[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<AdminSurveyResponseItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Publish Version Modal state
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [publishComment, setPublishComment] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Load Surveys Catalog
  const loadSurveys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/surveys`);
      if (res.ok) {
        const data: AdminSurveyItem[] = await res.json();
        setSurveys(data);
        if (data.length > 0 && !selectedSurvey) {
          const initial = initialSurveyId ? data.find((s) => s.id === initialSurveyId) || data[0] : data[0];
          setSelectedSurvey(initial);
          setSelectedVersion(initial.latestVersionNumber || 1);
        }
      }
    } catch (err) {
      console.error('Error fetching surveys:', err);
      // Fallback mock if offline
      const mock: AdminSurveyItem[] = [
        {
          id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          slug: 'taste-discovery',
          title: 'Vayyari VIP Taste Discovery',
          description: 'Curated saree & silk taste intake with +700 Mudras rewards and Gold VIP Pass minting',
          category: 'taste_profile',
          audienceType: 'guest',
          defaultLanguage: 'en',
          hasUncommittedDraft: false,
          latestVersionNumber: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setSurveys(mock);
      setSelectedSurvey(mock[0]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Survey Version Detail with Questions
  const loadSurveyVersion = async (slug: string, version: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/surveys/${slug}?version=${version}`);
      if (res.ok) {
        const data = await res.json();
        setSurveyDetail(data);
      }
    } catch (err) {
      console.error('Error fetching survey version:', err);
    }
  };

  // Load Responses for Selected Survey
  const loadResponses = async (surveyId: string, version?: number) => {
    try {
      const url = version
        ? `${apiBaseUrl}/api/v1/admin/surveys/${surveyId}/responses?version=${version}&limit=50`
        : `${apiBaseUrl}/api/v1/admin/surveys/${surveyId}/responses?limit=50`;
      const res = await fetch(url);
      if (res.ok) {
        const data: AdminSurveyResponseItem[] = await res.json();
        setResponses(data);
      }
    } catch (err) {
      console.error('Error fetching responses:', err);
      // Mock sample responses
      setResponses([
        {
          id: 'ea4fe7c1-2610-496f-aa49-d0963f20440e',
          surveyId,
          versionNumber: 1,
          userId: 'usr_wa_9876543210',
          virtualUserId: 'dev_test_smoke_001',
          phone: '9876543210',
          language: 'te',
          questionsAnsweredCount: 4,
          earnedMudras: 700,
          originRoute: 'order_confirmation',
          submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          answers: {
            q_weave_preference: ['kanjeevaram', 'banarasi'],
            q_craftsmanship_rating: 5,
            q_wardrobe_persona: 'women_sarees',
            q_vip_contact: '9876543210',
          },
          hiddenFields: {
            orderId: 'ord_998124',
            campaignUtm: 'diwali_exclusive',
          },
        },
      ]);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      loadSurveyVersion(selectedSurvey.slug, selectedVersion);
      loadResponses(selectedSurvey.id, selectedVersion);
    }
  }, [selectedSurvey, selectedVersion]);

  // Handle Publish New Version
  const handlePublishNewVersion = async () => {
    if (!selectedSurvey || !publishComment.trim()) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/surveys/${selectedSurvey.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionComment: publishComment,
          publishedBy: 'squad_admin',
        }),
      });

      if (res.ok) {
        const newVer = await res.json();
        setShowPublishModal(false);
        setPublishComment('');
        await loadSurveys();
        setSelectedVersion(newVer.versionNumber);
        alert(`Version ${newVer.versionNumber} successfully published!`);
      }
    } catch (err) {
      console.error('Error publishing version:', err);
      alert('Failed to publish version.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <YStack width="100%" minHeight="100vh" backgroundColor="#0b0d11" padding={24} gap={20}>
      {/* 1. Header Toolbar */}
      <XStack justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="#1f242d" paddingBottom={18}>
        <YStack gap={4}>
          <XStack alignItems="center" gap={10}>
            <LuLayers size={24} color="#D4AF37" />
            <Text color="#ffffff" fontSize={22} fontWeight="800" letterSpacing={0.5}>
              Survey Framework Studio & Visualizer
            </Text>
            <XStack backgroundColor="rgba(212, 175, 55, 0.15)" paddingHorizontal={10} paddingVertical={3} borderRadius={8}>
              <Text color="#D4AF37" fontSize={11} fontWeight="800" textTransform="uppercase">
                Production Admin
              </Text>
            </XStack>
          </XStack>
          <Text color="#9ca3af" fontSize={13}>
            Manage question banks, version promotions, audience rules, and inspect customer response submissions.
          </Text>
        </YStack>

        {/* Studio Tabs */}
        <XStack backgroundColor="#151821" borderRadius={12} padding={4} gap={4}>
          <XStack
            cursor="pointer"
            paddingHorizontal={16}
            paddingVertical={8}
            borderRadius={8}
            backgroundColor={activeTab === 'catalog' ? '#252a36' : 'transparent'}
            hoverStyle={{ backgroundColor: '#1d222d' }}
            onPress={() => setActiveTab('catalog')}
            alignItems="center"
            gap={8}
          >
            <LuFileText size={16} color={activeTab === 'catalog' ? '#D4AF37' : '#9ca3af'} />
            <Text color={activeTab === 'catalog' ? '#ffffff' : '#9ca3af'} fontSize={13} fontWeight="700">
              Surveys Catalog
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            paddingHorizontal={16}
            paddingVertical={8}
            borderRadius={8}
            backgroundColor={activeTab === 'questions' ? '#252a36' : 'transparent'}
            hoverStyle={{ backgroundColor: '#1d222d' }}
            onPress={() => setActiveTab('questions')}
            alignItems="center"
            gap={8}
          >
            <LuLayers size={16} color={activeTab === 'questions' ? '#D4AF37' : '#9ca3af'} />
            <Text color={activeTab === 'questions' ? '#ffffff' : '#9ca3af'} fontSize={13} fontWeight="700">
              Questions & Options Studio
            </Text>
          </XStack>

          <XStack
            cursor="pointer"
            paddingHorizontal={16}
            paddingVertical={8}
            borderRadius={8}
            backgroundColor={activeTab === 'responses' ? '#252a36' : 'transparent'}
            hoverStyle={{ backgroundColor: '#1d222d' }}
            onPress={() => setActiveTab('responses')}
            alignItems="center"
            gap={8}
          >
            <LuEye size={16} color={activeTab === 'responses' ? '#D4AF37' : '#9ca3af'} />
            <Text color={activeTab === 'responses' ? '#ffffff' : '#9ca3af'} fontSize={13} fontWeight="700">
              Response Visualizer ({responses.length})
            </Text>
          </XStack>
        </XStack>
      </XStack>

      {/* 2. Survey Selector Banner */}
      {selectedSurvey && (
        <XStack
          backgroundColor="#13161e"
          borderWidth={1}
          borderColor="#232936"
          borderRadius={14}
          padding={16}
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={16}>
            <YStack>
              <XStack alignItems="center" gap={10}>
                <Text color="#ffffff" fontSize={16} fontWeight="800">
                  {selectedSurvey.title}
                </Text>
                <XStack
                  backgroundColor={selectedSurvey.audienceType === 'guest' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={6}
                >
                  <Text
                    color={selectedSurvey.audienceType === 'guest' ? '#60a5fa' : '#34d399'}
                    fontSize={11}
                    fontWeight="700"
                    textTransform="uppercase"
                  >
                    {selectedSurvey.audienceType} survey
                  </Text>
                </XStack>
                {selectedSurvey.hasUncommittedDraft && (
                  <XStack backgroundColor="rgba(245, 158, 11, 0.2)" paddingHorizontal={8} paddingVertical={2} borderRadius={6}>
                    <Text color="#fbbf24" fontSize={11} fontWeight="700">
                      Unpublished Draft Changes
                    </Text>
                  </XStack>
                )}
              </XStack>
              <Text color="#9ca3af" fontSize={12} marginTop={2}>
                Slug: <Text color="#D4AF37">{selectedSurvey.slug}</Text> • Reward: +700 Mudras ({surveyDetail?.pointsPerQuestion || 175}/step)
              </Text>
            </YStack>
          </XStack>

          {/* Version Switcher and Publish Actions */}
          <XStack alignItems="center" gap={12}>
            <XStack alignItems="center" gap={8} backgroundColor="#1c212c" paddingHorizontal={12} paddingVertical={6} borderRadius={8}>
              <LuHistory size={14} color="#9ca3af" />
              <Text color="#9ca3af" fontSize={12} fontWeight="600">
                Version:
              </Text>
              <Text color="#D4AF37" fontSize={13} fontWeight="800">
                v{selectedVersion} (Latest Published)
              </Text>
            </XStack>

            <XStack
              cursor="pointer"
              backgroundColor="#D4AF37"
              hoverStyle={{ opacity: 0.9 }}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={8}
              alignItems="center"
              gap={6}
              onPress={() => setShowPublishModal(true)}
            >
              <LuSend size={14} color="#0b0d11" />
              <Text color="#0b0d11" fontSize={12} fontWeight="800" textTransform="uppercase">
                Publish New Version
              </Text>
            </XStack>
          </XStack>
        </XStack>
      )}

      {/* 3. TAB CONTENT */}
      {/* TAB A: SURVEYS CATALOG */}
      {activeTab === 'catalog' && (
        <YStack gap={16}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text color="#ffffff" fontSize={16} fontWeight="700">
              Active Survey Definitions ({surveys.length})
            </Text>
          </XStack>

          <YStack gap={12}>
            {surveys.map((s) => {
              const isSelected = selectedSurvey?.id === s.id;
              return (
                <XStack
                  key={s.id}
                  cursor="pointer"
                  backgroundColor={isSelected ? '#181c26' : '#12151c'}
                  borderWidth={1}
                  borderColor={isSelected ? '#D4AF37' : '#1f2533'}
                  borderRadius={12}
                  padding={16}
                  justifyContent="space-between"
                  alignItems="center"
                  hoverStyle={{ borderColor: '#D4AF37' }}
                  onPress={() => {
                    setSelectedSurvey(s);
                    setSelectedVersion(s.latestVersionNumber || 1);
                  }}
                >
                  <YStack gap={6} flex={1}>
                    <XStack alignItems="center" gap={10}>
                      <Text color="#ffffff" fontSize={15} fontWeight="700">
                        {s.title}
                      </Text>
                      <XStack backgroundColor="#212634" paddingHorizontal={8} paddingVertical={2} borderRadius={6}>
                        <Text color="#9ca3af" fontSize={11}>
                          /{s.slug}
                        </Text>
                      </XStack>
                      <XStack backgroundColor="rgba(212, 175, 55, 0.15)" paddingHorizontal={8} paddingVertical={2} borderRadius={6}>
                        <Text color="#D4AF37" fontSize={11} fontWeight="700">
                          v{s.latestVersionNumber}
                        </Text>
                      </XStack>
                    </XStack>
                    <Text color="#9ca3af" fontSize={12} numberOfLines={2}>
                      {s.description}
                    </Text>
                  </YStack>

                  <XStack alignItems="center" gap={16}>
                    <YStack alignItems="flex-end">
                      <Text color="#9ca3af" fontSize={11}>
                        Audience: <Text color="#ffffff" fontWeight="700">{s.audienceType}</Text>
                      </Text>
                      <Text color="#9ca3af" fontSize={11}>
                        Default Lang: <Text color="#ffffff" fontWeight="700">{s.defaultLanguage}</Text>
                      </Text>
                    </YStack>
                    <LuChevronRight size={18} color={isSelected ? '#D4AF37' : '#6b7280'} />
                  </XStack>
                </XStack>
              );
            })}
          </YStack>
        </YStack>
      )}

      {/* TAB B: QUESTIONS & OPTIONS STUDIO */}
      {activeTab === 'questions' && surveyDetail && (
        <YStack gap={16}>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack gap={2}>
              <Text color="#ffffff" fontSize={16} fontWeight="700">
                Ordered Questions in Version {selectedVersion} ({surveyDetail.questions?.length || 0})
              </Text>
              <Text color="#9ca3af" fontSize={12}>
                Each question is atomic and contains multilingual verses, embedded options, and branching rules.
              </Text>
            </YStack>
          </XStack>

          <YStack gap={16}>
            {surveyDetail.questions?.map((mapping: any, idx: number) => {
              const q = mapping.question;
              return (
                <YStack
                  key={mapping.questionId}
                  backgroundColor="#141720"
                  borderWidth={1}
                  borderColor="#202634"
                  borderRadius={14}
                  padding={20}
                  gap={14}
                >
                  {/* Question Header Row */}
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <XStack alignItems="center" gap={12}>
                      <XStack
                        width={32}
                        height={32}
                        borderRadius={16}
                        backgroundColor="rgba(212, 175, 55, 0.2)"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text color="#D4AF37" fontSize={14} fontWeight="800">
                          {mapping.sequenceOrder}
                        </Text>
                      </XStack>
                      <YStack>
                        <XStack alignItems="center" gap={8}>
                          <Text color="#ffffff" fontSize={15} fontWeight="700">
                            {q.questionKey}
                          </Text>
                          <XStack backgroundColor="#212634" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                            <Text color="#9ca3af" fontSize={10} textTransform="uppercase">
                              Rev {q.revisionNumber}
                            </Text>
                          </XStack>
                          <XStack backgroundColor="rgba(59, 130, 246, 0.15)" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                            <Text color="#60a5fa" fontSize={10} textTransform="uppercase">
                              {q.questionType}
                            </Text>
                          </XStack>
                          {mapping.isTerminalQuestion && (
                            <XStack backgroundColor="rgba(239, 68, 68, 0.15)" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                              <Text color="#f87171" fontSize={10} textTransform="uppercase">
                                Terminal Step
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                        <Text color="#D4AF37" fontSize={11} marginTop={2}>
                          {q.statements?.kicker?.en || 'STEP'} • +{q.points} Mudras Reward
                        </Text>
                      </YStack>
                    </XStack>

                    {mapping.defaultNextQuestionKey && (
                      <XStack backgroundColor="#1c212c" paddingHorizontal={10} paddingVertical={4} borderRadius={6} gap={6} alignItems="center">
                        <Text color="#9ca3af" fontSize={11}>
                          Branch Next:
                        </Text>
                        <Text color="#D4AF37" fontSize={11} fontWeight="700">
                          {mapping.defaultNextQuestionKey}
                        </Text>
                      </XStack>
                    )}
                  </XStack>

                  {/* Multilingual Statement Preview */}
                  <YStack backgroundColor="#0d0f15" borderRadius={8} padding={12} gap={6}>
                    <Text color="#9ca3af" fontSize={11} fontWeight="700" textTransform="uppercase">
                      Statements (English / Telugu / Hindi):
                    </Text>
                    <Text color="#ffffff" fontSize={13} fontWeight="600">
                      🇬🇧 EN: {q.statements?.title?.en}
                    </Text>
                    {q.statements?.title?.te && (
                      <Text color="#a7f3d0" fontSize={13}>
                        🇮🇳 TE: {q.statements?.title?.te}
                      </Text>
                    )}
                    {q.statements?.title?.hi && (
                      <Text color="#fed7aa" fontSize={13}>
                        🇮🇳 HI: {q.statements?.title?.hi}
                      </Text>
                    )}
                  </YStack>

                  {/* Options Grid Preview */}
                  {q.options && q.options.length > 0 && (
                    <YStack gap={8}>
                      <Text color="#9ca3af" fontSize={11} fontWeight="700" textTransform="uppercase">
                        Configured Options ({q.options.length}):
                      </Text>
                      <XStack flexWrap="wrap" gap={8}>
                        {q.options.map((opt: any) => (
                          <XStack
                            key={opt.id}
                            backgroundColor="#1a1e28"
                            borderWidth={1}
                            borderColor="#2b3242"
                            borderRadius={8}
                            paddingHorizontal={12}
                            paddingVertical={8}
                            alignItems="center"
                            gap={8}
                          >
                            {opt.icon && getVectorIcon(opt.icon, 16)}
                            <YStack>
                              <Text color="#ffffff" fontSize={12} fontWeight="700">
                                {opt.statements?.en || opt.id}
                              </Text>
                              {opt.statements?.te && (
                                <Text color="#9ca3af" fontSize={11}>
                                  {opt.statements?.te}
                                </Text>
                              )}
                            </YStack>
                            {opt.nextQuestionKey && (
                              <XStack backgroundColor="#2c3345" paddingHorizontal={6} paddingVertical={2} borderRadius={4} gap={4}>
                                <LuArrowRight size={10} color="#D4AF37" />
                                <Text color="#D4AF37" fontSize={10}>
                                  {opt.nextQuestionKey}
                                </Text>
                              </XStack>
                            )}
                          </XStack>
                        ))}
                      </XStack>
                    </YStack>
                  )}
                </YStack>
              );
            })}
          </YStack>
        </YStack>
      )}

      {/* TAB C: GENERIC RESPONSE VISUALIZER */}
      {activeTab === 'responses' && (
        <YStack gap={16}>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack gap={2}>
              <Text color="#ffffff" fontSize={16} fontWeight="700">
                Customer Submissions for {selectedSurvey?.title}
              </Text>
              <Text color="#9ca3af" fontSize={12}>
                All submissions recorded with version stamp, virtual user device signature, and synced wallet credit.
              </Text>
            </YStack>
            <XStack
              cursor="pointer"
              backgroundColor="#1a1e28"
              paddingHorizontal={12}
              paddingVertical={6}
              borderRadius={8}
              alignItems="center"
              gap={6}
              onPress={() => selectedSurvey && loadResponses(selectedSurvey.id, selectedVersion)}
            >
              <LuRefreshCw size={13} color="#D4AF37" />
              <Text color="#D4AF37" fontSize={12} fontWeight="700">
                Refresh
              </Text>
            </XStack>
          </XStack>

          {/* Submissions Table */}
          <YStack backgroundColor="#12151c" borderWidth={1} borderColor="#1f2533" borderRadius={14} overflow="hidden">
            {/* Table Header */}
            <XStack backgroundColor="#171b24" paddingHorizontal={16} paddingVertical={12} borderBottomWidth={1} borderColor="#1f2533">
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" width="16%">
                Version & Route
              </Text>
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" width="28%">
                Customer Identity (User / Device)
              </Text>
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" width="14%">
                Language
              </Text>
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" width="16%">
                Answers & Mudras
              </Text>
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" width="16%">
                Submitted At
              </Text>
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" width="10%">
                Actions
              </Text>
            </XStack>

            {/* Table Rows */}
            {responses.map((r) => (
              <XStack
                key={r.id}
                paddingHorizontal={16}
                paddingVertical={14}
                borderBottomWidth={1}
                borderColor="#181c26"
                alignItems="center"
                hoverStyle={{ backgroundColor: '#161922' }}
              >
                {/* Version & Route */}
                <YStack width="16%" gap={2}>
                  <XStack alignItems="center" gap={6}>
                    <XStack backgroundColor="rgba(212, 175, 55, 0.15)" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                      <Text color="#D4AF37" fontSize={11} fontWeight="800">
                        v{r.versionNumber}
                      </Text>
                    </XStack>
                  </XStack>
                  <Text color="#9ca3af" fontSize={11}>
                    Route: <Text color="#ffffff">{r.originRoute || 'organic'}</Text>
                  </Text>
                </YStack>

                {/* Identity: 1 Registered User <-> N Virtual Device IDs */}
                <YStack width="28%" gap={2}>
                  {r.userId ? (
                    <XStack alignItems="center" gap={6}>
                      <LuUsers size={13} color="#10b981" />
                      <Text color="#10b981" fontSize={12} fontWeight="700">
                        {r.userId}
                      </Text>
                    </XStack>
                  ) : (
                    <XStack alignItems="center" gap={6}>
                      <LuSmartphone size={13} color="#60a5fa" />
                      <Text color="#60a5fa" fontSize={12} fontWeight="600">
                        Guest Device
                      </Text>
                    </XStack>
                  )}
                  <Text color="#6b7280" fontSize={11} fontFamily="monospace" numberOfLines={1}>
                    FP: {r.virtualUserId}
                  </Text>
                  {r.phone && (
                    <Text color="#9ca3af" fontSize={11}>
                      Phone: <Text color="#ffffff">{r.phone}</Text>
                    </Text>
                  )}
                </YStack>

                {/* Language */}
                <XStack width="14%" alignItems="center" gap={6}>
                  <LuGlobe size={13} color="#D4AF37" />
                  <Text color="#ffffff" fontSize={12} fontWeight="700" textTransform="uppercase">
                    {r.language}
                  </Text>
                </XStack>

                {/* Answers & Mudras */}
                <YStack width="16%" gap={2}>
                  <XStack alignItems="center" gap={6}>
                    <LuCoins size={14} color="#D4AF37" />
                    <Text color="#D4AF37" fontSize={13} fontWeight="800">
                      +{r.earnedMudras} Mudras
                    </Text>
                  </XStack>
                  <Text color="#9ca3af" fontSize={11}>
                    {r.questionsAnsweredCount} Questions Answered
                  </Text>
                </YStack>

                {/* Timestamp */}
                <YStack width="16%" gap={2}>
                  <Text color="#ffffff" fontSize={12}>
                    {new Date(r.submittedAt).toLocaleDateString()}
                  </Text>
                  <Text color="#6b7280" fontSize={11}>
                    {new Date(r.submittedAt).toLocaleTimeString()}
                  </Text>
                </YStack>

                {/* Inspect Action */}
                <XStack width="10%">
                  <XStack
                    cursor="pointer"
                    backgroundColor="#212634"
                    hoverStyle={{ backgroundColor: '#2c3346' }}
                    paddingHorizontal={10}
                    paddingVertical={6}
                    borderRadius={6}
                    alignItems="center"
                    gap={6}
                    onPress={() => setSelectedResponse(r)}
                  >
                    <LuEye size={13} color="#ffffff" />
                    <Text color="#ffffff" fontSize={11} fontWeight="700">
                      View
                    </Text>
                  </XStack>
                </XStack>
              </XStack>
            ))}
          </YStack>
        </YStack>
      )}

      {/* 4. SINGLE RESPONSE INSPECTOR MODAL */}
      {selectedResponse && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={9999}
          backgroundColor="rgba(10, 10, 10, 0.85)"
          justifyContent="center"
          alignItems="center"
          padding={20}
        >
          <YStack
            width="100%"
            maxWidth={640}
            backgroundColor="#141720"
            borderWidth={1}
            borderColor="#D4AF37"
            borderRadius={20}
            padding={24}
            gap={16}
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={10}>
                <LuFileText size={20} color="#D4AF37" />
                <Text color="#ffffff" fontSize={18} fontWeight="800">
                  Response Submission Inspector
                </Text>
              </XStack>
              <XStack
                cursor="pointer"
                padding={6}
                borderRadius={16}
                backgroundColor="rgba(255,255,255,0.08)"
                onPress={() => setSelectedResponse(null)}
              >
                <LuX size={18} color="#9ca3af" />
              </XStack>
            </XStack>

            <YStack gap={10}>
              <XStack backgroundColor="#0d0f15" padding={12} borderRadius={8} justifyContent="space-between">
                <Text color="#9ca3af" fontSize={12}>
                  Response ID: <Text color="#ffffff" fontFamily="monospace">{selectedResponse.id}</Text>
                </Text>
                <Text color="#D4AF37" fontSize={12} fontWeight="700">
                  Version {selectedResponse.versionNumber}
                </Text>
              </XStack>

              {/* Answers Breakdown */}
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" marginTop={8}>
                Submitted Answers:
              </Text>
              <YStack backgroundColor="#0d0f15" padding={14} borderRadius={8} gap={8}>
                <pre style={{ margin: 0, color: '#a7f3d0', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selectedResponse.answers || {}, null, 2)}
                </pre>
              </YStack>

              {/* Hidden Context Fields */}
              <Text color="#9ca3af" fontSize={11} fontWeight="800" textTransform="uppercase" marginTop={8}>
                Hidden Parameter Context:
              </Text>
              <YStack backgroundColor="#0d0f15" padding={14} borderRadius={8} gap={8}>
                <pre style={{ margin: 0, color: '#fed7aa', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selectedResponse.hiddenFields || {}, null, 2)}
                </pre>
              </YStack>
            </YStack>
          </YStack>
        </YStack>
      )}

      {/* 5. PUBLISH VERSION MODAL */}
      {showPublishModal && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={9999}
          backgroundColor="rgba(10, 10, 10, 0.85)"
          justifyContent="center"
          alignItems="center"
          padding={20}
        >
          <YStack
            width="100%"
            maxWidth={500}
            backgroundColor="#141720"
            borderWidth={1}
            borderColor="#D4AF37"
            borderRadius={20}
            padding={24}
            gap={16}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={10}>
                <LuSend size={20} color="#D4AF37" />
                <Text color="#ffffff" fontSize={18} fontWeight="800">
                  Publish Survey Version
                </Text>
              </XStack>
              <XStack cursor="pointer" padding={6} borderRadius={16} onPress={() => setShowPublishModal(false)}>
                <LuX size={18} color="#9ca3af" />
              </XStack>
            </XStack>

            <Text color="#9ca3af" fontSize={13}>
              Publishing promotes all current draft questions, statements, and option branching into an immutable sequential version (v{selectedSurvey ? selectedSurvey.latestVersionNumber + 1 : 2}).
            </Text>

            <YStack gap={8}>
              <Text color="#ffffff" fontSize={12} fontWeight="700">
                Version Release Changelog Comment:
              </Text>
              <textarea
                value={publishComment}
                onChange={(e) => setPublishComment(e.target.value)}
                placeholder="e.g. Added Telugu/Hindi verses, updated Kanchipuram vector icon, and refined Gold VIP Pass minting"
                rows={4}
                style={{
                  backgroundColor: '#0d0f15',
                  color: '#ffffff',
                  border: '1px solid #283042',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </YStack>

            <XStack justifyContent="flex-end" gap={10} marginTop={8}>
              <XStack
                cursor="pointer"
                paddingHorizontal={16}
                paddingVertical={10}
                borderRadius={8}
                backgroundColor="#212634"
                onPress={() => setShowPublishModal(false)}
              >
                <Text color="#9ca3af" fontSize={13} fontWeight="600">
                  Cancel
                </Text>
              </XStack>

              <XStack
                cursor="pointer"
                paddingHorizontal={20}
                paddingVertical={10}
                borderRadius={8}
                backgroundColor="#D4AF37"
                onPress={handlePublishNewVersion}
              >
                <Text color="#0b0d11" fontSize={13} fontWeight="800">
                  {isPublishing ? 'Publishing Snapshot...' : 'Publish Version'}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
};
