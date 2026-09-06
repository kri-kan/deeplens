import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { useNavigation } from '../../app/NavigationContext';

export const StepWelcome: React.FC = () => {
  const { nextStep } = useOnboarding();
  const { navigate } = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.heroWrapper}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>✦ GI-TAGGED HERITAGE</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>AUTHENTIC INDIAN HANDLOOMS</Text>
        <Text style={styles.title}>The Loom of Vayyari</Text>
        <Text style={styles.subtitle}>
          Curated directly from master weavers across Varanasi, Kanchipuram, and Paithan. Pure silks, hand-spun zari, and verified artisan provenance.
        </Text>

        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.primaryButton} onPress={nextStep} activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>Begin Curation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryLink} onPress={() => navigate('login')}>
            <Text style={styles.secondaryLinkText}>Already an artisan patron? <Text style={styles.bold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    justifyContent: 'space-between',
  },
  heroWrapper: {
    height: '45%',
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 54, 93, 0.4)',
  },
  badgePill: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    backgroundColor: 'rgba(26, 54, 93, 0.9)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-around',
  },
  eyebrow: {
    color: '#9C7A14',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A365D',
    textAlign: 'center',
    marginTop: 6,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  actionGroup: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1A365D',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FAF7F2',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryLinkText: {
    color: '#718096',
    fontSize: 13,
  },
  bold: {
    color: '#1A365D',
    fontWeight: '700',
  },
});
