import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Text, Checkbox, ActivityIndicator, useTheme, TextInput } from 'react-native-paper';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { productService } from '@/services/productService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

const CATEGORIES = [
  { id: 'saree', label: 'Saree' },
  { id: 'dress', label: 'Dress' },
  { id: 'lehanga', label: 'Lehanga' },
  { id: 'kids', label: 'Kids' },
  { id: 'general', label: 'Others' },
];

const SORT_OPTIONS = [
  { id: 'recent', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'listings_most', label: 'Most Listings' },
  { id: 'listings_least', label: 'Fewest Listings' },
];

const SECTIONS = ['Sort', 'Category', 'Price', 'Fabric', 'Vendor'] as const;
type SectionKey = typeof SECTIONS[number];

export interface FilterState {
  sortBy: string;
  categories: string[];
  minPrice: number;
  maxPrice: number;
  fabrics: string[];
  vendorNames: string[];
}

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  current: FilterState;
  onApply: (filters: FilterState) => void;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  sortBy: 'recent',
  categories: [],
  minPrice: 0,
  maxPrice: 0,
  fabrics: [],
  vendorNames: [],
};

export function FilterDrawer({ visible, onClose, current, onApply }: FilterDrawerProps) {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [activeSection, setActiveSection] = useState<SectionKey>('Sort');
  const [draft, setDraft] = useState<FilterState>(current);

  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState<{ fabrics: string[]; vendors: string[]; minPrice: number; maxPrice: number } | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Price slider state
  const [priceInput, setPriceInput] = useState({ min: String(current.minPrice), max: String(current.maxPrice) });
  const priceTrackWidth = useRef(0);

  const loadFilterOptions = useCallback(async () => {
    if (filterOptions) return;
    setLoadingOptions(true);
    try {
      const opts = await productService.getFilterOptions();
      setFilterOptions(opts);
      // Sync maxPrice defaults from API
      setDraft(d => ({ ...d, maxPrice: d.maxPrice === 0 ? 0 : d.maxPrice }));
      setPriceInput(p => ({ ...p, max: String(p.max === '0' ? opts.maxPrice : p.max) }));
    } catch (e) {
      console.error('Failed to load filter options', e);
    } finally {
      setLoadingOptions(false);
    }
  }, [filterOptions]);

  useEffect(() => {
    if (visible) {
      setDraft(current);
      setPriceInput({ min: String(current.minPrice), max: String(current.maxPrice) });
      loadFilterOptions();
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleApply = () => {
    const minP = parseInt(priceInput.min) || 0;
    let maxP = parseInt(priceInput.max) || filterOptions?.maxPrice || 20000;
    // If the selected max price is equal to or greater than the upper bound, treat it as unlimited (0)
    if (maxP >= (filterOptions?.maxPrice ?? 20000)) {
        maxP = 0;
    }
    const finalFilters = { ...draft, minPrice: minP, maxPrice: maxP };
    onApply(finalFilters);
    onClose();
  };

  const handleClear = () => {
    const fresh = {
      ...DEFAULT_FILTER_STATE,
      maxPrice: 0,
    };
    setDraft(fresh);
    setPriceInput({ min: '0', max: String(filterOptions?.maxPrice ?? 20000) });
  };

  const toggleFabric = (fabric: string) => {
    setDraft(d => ({
      ...d,
      fabrics: d.fabrics.includes(fabric) ? d.fabrics.filter(f => f !== fabric) : [...d.fabrics, fabric],
    }));
  };

  const toggleVendor = (vendor: string) => {
    setDraft(d => ({
      ...d,
      vendorNames: d.vendorNames.includes(vendor) ? d.vendorNames.filter(v => v !== vendor) : [...d.vendorNames, vendor],
    }));
  };

  const toggleCategory = (catId: string) => {
    setDraft(d => ({
      ...d,
      categories: d.categories.includes(catId) ? d.categories.filter(c => c !== catId) : [...d.categories, catId],
    }));
  };

  const activeCount =
    (draft.sortBy !== 'recent' ? 1 : 0) +
    (draft.categories.length > 0 ? 1 : 0) +
    draft.fabrics.length +
    draft.vendorNames.length +
    (draft.minPrice > 0 || draft.maxPrice > 0 ? 1 : 0);

  const renderContent = () => {
    const sectionBg = theme.dark ? '#1e1e2e' : '#fff';
    const textColor = theme.dark ? '#e0e0e0' : '#111';
    const mutedColor = theme.dark ? '#888' : '#666';

    if (activeSection === 'Sort') {
      return (
        <View style={styles.sectionContent}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.radioRow, draft.sortBy === opt.id && { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => setDraft(d => ({ ...d, sortBy: opt.id }))}
            >
              <View style={[styles.radioCircle, { borderColor: theme.colors.primary }]}>
                {draft.sortBy === opt.id && <View style={[styles.radioDot, { backgroundColor: theme.colors.primary }]} />}
              </View>
              <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeSection === 'Category') {
      return (
        <View style={styles.sectionContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.checkRow}
              onPress={() => toggleCategory(cat.id)}
            >
              <Checkbox
                status={draft.categories.includes(cat.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleCategory(cat.id)}
                color={theme.colors.primary}
              />
              <Text style={[styles.optionLabel, { color: textColor }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activeSection === 'Price') {
      const maxPriceBound = filterOptions?.maxPrice ?? 20000;
      return (
        <View style={styles.sectionContent}>
          <Text style={[styles.priceLabel, { color: mutedColor }]}>Price Range (₹)</Text>
          <View style={styles.priceInputRow}>
            <View style={styles.priceInputBox}>
              <Text style={{ color: mutedColor, fontSize: 11 }}>Min</Text>
              <TextInput
                style={[styles.priceValueInput, { color: textColor, backgroundColor: 'transparent' }]}
                value={priceInput.min}
                onChangeText={t => setPriceInput(p => ({ ...p, min: t }))}
                keyboardType="numeric"
                dense
              />
            </View>
            <Text style={{ color: mutedColor }}>—</Text>
            <View style={styles.priceInputBox}>
              <Text style={{ color: mutedColor, fontSize: 11 }}>Max</Text>
              <TextInput
                style={[styles.priceValueInput, { color: textColor, backgroundColor: 'transparent' }]}
                value={priceInput.max}
                onChangeText={t => setPriceInput(p => ({ ...p, max: t }))}
                keyboardType="numeric"
                dense
              />
            </View>
          </View>

          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <MultiSlider
              values={[parseInt(priceInput.min) || 0, parseInt(priceInput.max) || maxPriceBound]}
              sliderLength={(SCREEN_WIDTH * 0.85) - 130}
              onValuesChange={(values) => setPriceInput({ min: String(values[0]), max: String(values[1]) })}
              min={0}
              max={maxPriceBound}
              step={100}
              allowOverlap={false}
              snapped
              selectedStyle={{ backgroundColor: theme.colors.primary }}
              unselectedStyle={{ backgroundColor: theme.colors.surfaceVariant }}
              markerStyle={{ backgroundColor: theme.colors.primary, height: 20, width: 20, borderRadius: 10 }}
            />
          </View>

          {/* Quick preset buttons */}
          <Text style={[{ color: mutedColor, fontSize: 12, marginTop: 16, marginBottom: 8 }]}>Quick Presets</Text>
          {[
            { label: 'Under ₹500', min: 0, max: 500 },
            { label: '₹500 – ₹1500', min: 500, max: 1500 },
            { label: '₹1500 – ₹3000', min: 1500, max: 3000 },
            { label: '₹3000+', min: 3000, max: maxPriceBound },
          ].map(preset => {
            const active = parseInt(priceInput.min) === preset.min && parseInt(priceInput.max) === preset.max;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[styles.presetChip, active && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                onPress={() => setPriceInput({ min: String(preset.min), max: String(preset.max) })}
              >
                <Text style={[styles.presetLabel, { color: active ? theme.colors.primary : textColor }]}>{preset.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (activeSection === 'Fabric') {
      return (
        <View style={styles.sectionContent}>
          {loadingOptions && <ActivityIndicator style={{ marginTop: 20 }} />}
          {!loadingOptions && (filterOptions?.fabrics ?? []).map(fabric => (
            <TouchableOpacity
              key={fabric}
              style={styles.checkRow}
              onPress={() => toggleFabric(fabric)}
            >
              <Checkbox
                status={draft.fabrics.includes(fabric) ? 'checked' : 'unchecked'}
                onPress={() => toggleFabric(fabric)}
                color={theme.colors.primary}
              />
              <Text style={[styles.optionLabel, { color: textColor }]}>{fabric}</Text>
            </TouchableOpacity>
          ))}
          {!loadingOptions && (filterOptions?.fabrics ?? []).length === 0 && (
            <Text style={{ color: mutedColor, marginTop: 20, textAlign: 'center' }}>No fabric data available</Text>
          )}
        </View>
      );
    }

    if (activeSection === 'Vendor') {
      return (
        <View style={styles.sectionContent}>
          {loadingOptions && <ActivityIndicator style={{ marginTop: 20 }} />}
          {!loadingOptions && (filterOptions?.vendors ?? []).map(vendor => (
            <TouchableOpacity
              key={vendor}
              style={styles.checkRow}
              onPress={() => toggleVendor(vendor)}
            >
              <Checkbox
                status={draft.vendorNames.includes(vendor) ? 'checked' : 'unchecked'}
                onPress={() => toggleVendor(vendor)}
                color={theme.colors.primary}
              />
              <Text style={[styles.optionLabel, { color: textColor }]}>{vendor}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  const navBg = theme.dark ? '#141420' : '#f5f5f7';
  const drawerBg = theme.dark ? '#1e1e2e' : '#ffffff';
  const textColor = theme.dark ? '#e0e0e0' : '#111';
  const mutedColor = theme.dark ? '#888' : '#888';
  const borderColor = theme.dark ? '#2a2a3a' : '#efefef';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Dim backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, backgroundColor: drawerBg, transform: [{ translateX }] }]}>
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.drawerTitle, { color: textColor }]}>FILTERS</Text>
            {activeCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </View>

          {/* Two-panel layout */}
          <View style={styles.panels}>
            {/* Left nav rail */}
            <View style={[styles.navRail, { backgroundColor: navBg }]}>
              {SECTIONS.map(section => {
                const isActive = activeSection === section;
                const sectionBadge =
                  section === 'Sort' && draft.sortBy !== 'recent' ? 1 :
                  section === 'Category' && draft.categories.length > 0 ? draft.categories.length :
                  section === 'Fabric' ? draft.fabrics.length :
                  section === 'Vendor' ? draft.vendorNames.length :
                  section === 'Price' && (draft.minPrice > 0 || draft.maxPrice > 0) ? 1 : 0;

                return (
                  <TouchableOpacity
                    key={section}
                    style={[styles.navItem, isActive && { backgroundColor: drawerBg, borderLeftWidth: 3, borderLeftColor: theme.colors.primary }]}
                    onPress={() => setActiveSection(section)}
                  >
                    <Text style={[styles.navLabel, { color: isActive ? theme.colors.primary : mutedColor, fontWeight: isActive ? '700' : '400' }]}>
                      {section}
                    </Text>
                    {sectionBadge > 0 && (
                      <View style={[styles.navBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.navBadgeText}>{sectionBadge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Right content */}
            <ScrollView style={styles.contentPanel} showsVerticalScrollIndicator={false}>
              {renderContent()}
            </ScrollView>
          </View>

          {/* Footer actions */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={[styles.clearText, { color: mutedColor }]}>CLEAR ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]} onPress={handleApply}>
              <Text style={styles.applyText}>APPLY{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    flex: 1,
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  panels: {
    flex: 1,
    flexDirection: 'row',
  },
  navRail: {
    width: 100,
  },
  navItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  navLabel: {
    fontSize: 12,
    flex: 1,
  },
  navBadge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  contentPanel: {
    flex: 1,
  },
  sectionContent: {
    padding: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: 13,
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 12,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  priceInputBox: {
    flex: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  priceValueInput: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    height: 40,
    width: '100%',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    marginVertical: 8,
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 4,
  },
  applyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
