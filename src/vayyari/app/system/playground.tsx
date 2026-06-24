import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator, Surface, useTheme, Divider, SegmentedButtons } from 'react-native-paper';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { searchApiClient } from '@/api/client';
import { productService } from '@/services/productService';

const { width } = Dimensions.get('window');

interface TestCategorizationResponse {
  category: string;
  method: string;
  matchedToken?: string;
  matchedKeyword?: string;
  allowedDistance?: number;
  actualDistance?: number;
  cleanedDescription: string;
  aiResult?: any;
}

interface TestSimilarityMatch {
  productId: string;
  sku: string;
  title: string;
  phash: string;
  distance: number;
  similarityPercentage: number;
  storagePath?: string;
}

interface TestSimilarityResponse {
  referenceProduct: { id: string; sku: string; phash: string };
  matches: TestSimilarityMatch[];
}

export default function SystemPlaygroundScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('categorization');

  // Categorization States
  const [descriptionInput, setDescriptionInput] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [catResult, setCatResult] = useState<TestCategorizationResponse | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  // Similarity States
  const [skuInput, setSkuInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<TestSimilarityResponse | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const testDescriptions = [
    {
      label: 'VF45E (Taby/Baby Fuzzy Fix)',
      text: '👗Gown Febrics Organza Soft Taby Silk Heavy Quality Fabric With Digital Print And , Full Long Sleeve , Choli Hand Rebin Work \n\n👗Gown : Organza Taby Silk \n\n#partywear #wedding #gown',
    },
    {
      label: 'VF518 (Link Strip Fix)',
      text: 'Kurti - https://chat.whatsapp.com/H9rafAwu20RFpwYLABjQeZ\n\nKids - https://chat.whatsapp.com/FuvDoRkCz9S52dH325Rvsj\n\nFabric - Silk crush Fabric Saree With Fancy Handwork (Bids) All over work saree With Fancy Bids Work Blouse',
    },
    {
      label: 'VF609 (Frock to Dress)',
      text: '🤍*\n\nCelebrate this joy of dressing in the best way here presenting you a beautiful and comfortable maxi for the upcoming season with beautiful Embroidery White 🤍 Heart All Over In Black Frock 😍\n\n*DETAILS*\n✓Material :- Maska Cotton \n✓Complete linning',
    },
  ];

  const testSkus = ['VF212', 'VF1F7', 'VF279', 'VF347'];

  const handleTestCategorization = async () => {
    if (!descriptionInput.trim()) {
      setCatError('Please enter a WhatsApp product description.');
      return;
    }
    setCatLoading(true);
    setCatError(null);
    setCatResult(null);
    try {
      const response = await searchApiClient.post<TestCategorizationResponse>('/api/v1/ai/test-categorization', {
        description: descriptionInput,
      });
      setCatResult(response);
    } catch (err: any) {
      console.error('Categorization prediction failed:', err);
      setCatError(err?.message || 'Failed to analyze description.');
    } finally {
      setCatLoading(false);
    }
  };

  const handleTestSimilarity = async (skuVal?: string) => {
    const targetSku = skuVal || skuInput;
    if (!targetSku.trim()) {
      setSimError('Please enter or select a product SKU.');
      return;
    }
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const response = await searchApiClient.get<TestSimilarityResponse>(`/api/v1/ai/test-similarity?query=${encodeURIComponent(targetSku.trim())}`);
      setSimResult(response);
    } catch (err: any) {
      console.error('Similarity search failed:', err);
      setSimError(err?.response?.data?.message || err?.message || 'Failed to compute similarity.');
    } finally {
      setSimLoading(false);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'static':
        return { label: 'Static Match', color: '#00a86b', bgColor: 'rgba(0,168,107,0.1)' };
      case 'ai':
        return { label: 'AI Extraction', color: '#9C27B0', bgColor: 'rgba(156,39,176,0.1)' };
      default:
        return { label: 'Others Default', color: '#757575', bgColor: 'rgba(117,117,117,0.1)' };
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'saree': return '#E91E63';
      case 'lehanga': return '#9C27B0';
      case 'dress': return '#3F51B5';
      case 'kids': return '#FF9800';
      default: return '#607D8B';
    }
  };

  return (
    <ScreenWrapper title="System Playground" withScrollView={false}>
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'categorization', label: 'Categorisation', icon: 'tag-outline' },
            { value: 'similarity', label: 'Visual Similarity', icon: 'image-multiple-outline' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'categorization' ? (
          <View>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Test WhatsApp Description Categorisation
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Tests static token keywords (strip URLs, frock remapping, exact ≤4 chars check) and AI extraction fallback.
            </Text>

            {/* Quick Test Chips */}
            <View style={styles.chipRow}>
              {testDescriptions.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.chip, { borderColor: theme.colors.outline }]}
                  onPress={() => {
                    setDescriptionInput(item.text);
                    setCatResult(null);
                  }}
                >
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              mode="outlined"
              label="WhatsApp Product Message Description"
              placeholder="Paste raw vendor message text here..."
              multiline
              numberOfLines={6}
              value={descriptionInput}
              onChangeText={setDescriptionInput}
              style={styles.textInput}
            />

            <Button
              mode="contained"
              icon="rocket"
              loading={catLoading}
              disabled={catLoading}
              onPress={handleTestCategorization}
              style={styles.actionBtn}
            >
              Analyze Description
            </Button>

            {catError && (
              <Surface style={styles.errorSurface} elevation={1}>
                <Text style={styles.errorText}>⚠️ {catError}</Text>
              </Surface>
            )}

            {catResult && (
              <Card style={styles.resultCard} mode="outlined">
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      Diagnostic Result
                    </Text>
                    {(() => {
                      const badge = getMethodBadge(catResult.method);
                      return (
                        <Surface style={[styles.badge, { backgroundColor: badge.bgColor }]} elevation={0}>
                          <Text style={{ color: badge.color, fontSize: 11, fontWeight: '700' }}>
                            {badge.label}
                          </Text>
                        </Surface>
                      );
                    })()}
                  </View>
                  <Divider style={styles.divider} />

                  <View style={styles.resultRow}>
                    <Text variant="bodyMedium" style={styles.label}>
                      Categorised As:
                    </Text>
                    <Surface
                      style={[
                        styles.catLabelBadge,
                        { backgroundColor: getCategoryColor(catResult.category) },
                      ]}
                      elevation={0}
                    >
                      <Text style={styles.catLabelText}>{catResult.category.toUpperCase()}</Text>
                    </Surface>
                  </View>

                  {catResult.method === 'static' && (
                    <View style={styles.diagnosticDetails}>
                      <Text variant="bodySmall" style={styles.diagnosticTitle}>
                        Static Match Details:
                      </Text>
                      <View style={styles.diagnosticRow}>
                        <Text style={styles.diagnosticLabel}>Matched Token:</Text>
                        <Text style={styles.diagnosticValue}>{catResult.matchedToken}</Text>
                      </View>
                      <View style={styles.diagnosticRow}>
                        <Text style={styles.diagnosticLabel}>Keyword in DB:</Text>
                        <Text style={styles.diagnosticValue}>{catResult.matchedKeyword}</Text>
                      </View>
                      <View style={styles.diagnosticRow}>
                        <Text style={styles.diagnosticLabel}>Hamming/Levenshtein Dist:</Text>
                        <Text style={styles.diagnosticValue}>
                          {catResult.actualDistance} (Allowed: {catResult.allowedDistance})
                        </Text>
                      </View>
                    </View>
                  )}

                  {catResult.method === 'ai' && (
                    <View style={styles.diagnosticDetails}>
                      <Text variant="bodySmall" style={styles.diagnosticTitle}>
                        AI Extraction Details:
                      </Text>
                      <View style={styles.diagnosticRow}>
                        <Text style={styles.diagnosticLabel}>AI Raw Category:</Text>
                        <Text style={styles.diagnosticValue}>{catResult.aiResult?.category}</Text>
                      </View>
                      <View style={styles.diagnosticRow}>
                        <Text style={styles.diagnosticLabel}>Sub-Category:</Text>
                        <Text style={styles.diagnosticValue}>{catResult.aiResult?.subCategory}</Text>
                      </View>
                      <View style={styles.diagnosticRow}>
                        <Text style={styles.diagnosticLabel}>Fabric & Stitch Type:</Text>
                        <Text style={styles.diagnosticValue}>
                          {catResult.aiResult?.fabric} ({catResult.aiResult?.stitchType})
                        </Text>
                      </View>
                      {catResult.aiResult?.price && (
                        <View style={styles.diagnosticRow}>
                          <Text style={styles.diagnosticLabel}>Extracted Price:</Text>
                          <Text style={styles.diagnosticValue}>₹{catResult.aiResult.price}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <Text variant="bodySmall" style={styles.cleanedTitle}>
                    Cleaned Input Used For Tokenisation:
                  </Text>
                  <Surface style={styles.cleanedTextSurface} elevation={0}>
                    <Text variant="bodySmall" style={styles.cleanedText}>
                      {catResult.cleanedDescription || '[Description is empty after cleaning]'}
                    </Text>
                  </Surface>
                </Card.Content>
              </Card>
            )}
          </View>
        ) : (
          <View>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Test Image Similarity
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Tests Perceptual Image Hashing (dHash) and calculates the Hamming distance relative to other active product thumbnails.
            </Text>

            {/* Quick Test SKUs */}
            <View style={styles.chipRow}>
              {testSkus.map((sku) => (
                <TouchableOpacity
                  key={sku}
                  style={[styles.chip, { borderColor: theme.colors.outline }]}
                  onPress={() => {
                    setSkuInput(sku);
                    handleTestSimilarity(sku);
                  }}
                >
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    {sku}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.searchRow}>
              <TextInput
                mode="outlined"
                label="Product SKU Code"
                placeholder="Enter base SKU (e.g. VF212)"
                value={skuInput}
                onChangeText={setSkuInput}
                style={styles.searchInput}
              />
              <Button
                mode="contained"
                icon="image-search"
                loading={simLoading}
                disabled={simLoading}
                onPress={() => handleTestSimilarity()}
                style={styles.searchBtn}
              >
                Match
              </Button>
            </View>

            {simError && (
              <Surface style={styles.errorSurface} elevation={1}>
                <Text style={styles.errorText}>⚠️ {simError}</Text>
              </Surface>
            )}

            {simResult && (
              <View style={{ marginTop: 16 }}>
                <Card style={styles.refCard} mode="outlined">
                  <Card.Content style={styles.refContent}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                        Reference: {simResult.referenceProduct.sku}
                      </Text>
                      <Text variant="bodySmall" style={{ opacity: 0.5, marginTop: 4 }}>
                        pHash: {simResult.referenceProduct.phash}
                      </Text>
                    </View>
                    <View style={styles.refIconWrapper}>
                      <MaterialCommunityIcons name="image" size={32} color={theme.colors.primary} />
                    </View>
                  </Card.Content>
                </Card>

                <Text variant="titleSmall" style={styles.resultsHeaderTitle}>
                  Top Similarity Matches (Hamming distance 0 to 64)
                </Text>

                {simResult.matches.length === 0 ? (
                  <Text style={styles.emptyText}>No matching similar products found.</Text>
                ) : (
                  simResult.matches.map((item) => {
                    const similarityPct = item.similarityPercentage;
                    const getSimColor = (pct: number) => {
                      if (pct >= 90) return '#00a86b'; // green
                      if (pct >= 80) return '#FF9800'; // orange
                      return '#757575'; // gray
                    };

                    const thumbnailUri = item.storagePath
                      ? productService.getThumbnailUrlByPath(item.storagePath, 'medium')
                      : 'https://via.placeholder.com/150';

                    return (
                      <Card
                        key={item.productId}
                        style={styles.matchCard}
                        onPress={() => router.push(`/product/${item.productId}`)}
                      >
                        <Card.Content style={styles.matchContent}>
                          <Image source={{ uri: thumbnailUri }} style={styles.matchImage} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                              {item.sku}
                            </Text>
                            <Text variant="bodySmall" numberOfLines={1} style={{ opacity: 0.6 }}>
                              {item.title}
                            </Text>
                            <Text variant="bodySmall" style={{ opacity: 0.4, fontSize: 10, marginTop: 4 }}>
                              pHash: {item.phash}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              variant="titleSmall"
                              style={{ color: getSimColor(similarityPct), fontWeight: 'bold' }}
                            >
                              {similarityPct}%
                            </Text>
                            <Text variant="bodySmall" style={{ opacity: 0.5, fontSize: 10 }}>
                              Dist: {item.distance}
                            </Text>
                          </View>
                        </Card.Content>
                      </Card>
                    );
                  })
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  segmentedButtons: {
    alignSelf: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    opacity: 0.5,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  errorSurface: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  divider: {
    marginVertical: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontWeight: '700',
    marginRight: 8,
    color: '#333333',
  },
  catLabelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  catLabelText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  diagnosticDetails: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  diagnosticTitle: {
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  diagnosticLabel: {
    fontSize: 12,
    color: '#666',
  },
  diagnosticValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  cleanedTitle: {
    fontWeight: 'bold',
    opacity: 0.6,
    marginBottom: 6,
  },
  cleanedTextSurface: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cleanedText: {
    fontFamily: 'monospace',
    color: '#444',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchBtn: {
    height: 52,
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: 6,
  },
  refCard: {
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
  },
  refContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refIconWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 24,
  },
  resultsHeaderTitle: {
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#EEEEEE',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    marginVertical: 20,
  },
});
