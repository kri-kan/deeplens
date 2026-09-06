import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';

const STYLES = [
  { id: 'saree', label: 'Heirloom Sarees', desc: 'Kanjivaram, Banarasi, Chanderi, Paithani', icon: '🥻' },
  { id: 'silk', label: 'Pure Mulberry Silks', desc: 'Raw silk, Tussar, Muga, Organza drapes', icon: '🧵' },
  { id: 'kurta', label: 'Designer Kurta Sets', desc: 'Handcrafted resham, chikan, and zardozi', icon: '✨' },
  { id: 'lehanga', label: 'Festive & Bridal', desc: 'Heavy hand-embroidered heritage lehangas', icon: '👑' },
  { id: 'jewelry', label: 'Artisan Silver & Gold', desc: 'Kundan, Polki, Temple jewelry designs', icon: '💎' },
  { id: 'home', label: 'Heritage Living', desc: 'Handwoven cushions, throws, and tapestries', icon: '🏺' },
];

export const StepPreferences: React.FC = () => {
  const { selectedCategories, toggleCategory, nextStep } = useOnboarding();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>STEP 3 OF 5</Text>
        <Text style={styles.title}>Tailor Your Edit</Text>
        <Text style={styles.subtitle}>
          Select the crafts and handloom traditions you are interested in. We customize your storefront feed accordingly.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {STYLES.map((style) => {
          const isSelected = selectedCategories.includes(style.id);
          return (
            <TouchableOpacity
              key={style.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggleCategory(style.id)}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{style.icon}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>{style.label}</Text>
                <Text style={styles.cardDesc}>{style.desc}</Text>
              </View>
              <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                {isSelected && <Text style={styles.checkText}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={nextStep} activeOpacity={0.88}>
          <Text style={styles.buttonText}>
            Continue ({selectedCategories.length} Selected)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#FAF7F0',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 2,
  },
  cardTitleSelected: {
    color: '#1A365D',
  },
  cardDesc: {
    fontSize: 11,
    color: '#718096',
    lineHeight: 15,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkCircleSelected: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  checkText: {
    color: '#1A365D',
    fontSize: 12,
    fontWeight: '900',
  },
  footer: {
    paddingTop: 12,
  },
  button: {
    backgroundColor: '#1A365D',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
  },
});
