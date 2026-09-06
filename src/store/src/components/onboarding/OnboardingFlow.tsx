import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import { StepWelcome } from './StepWelcome';
import { StepLocation } from './StepLocation';
import { StepPreferences } from './StepPreferences';
import { StepNotifications } from './StepNotifications';
import { LoginScreen } from '../auth/LoginScreen';

export const OnboardingFlow: React.FC = () => {
  const { currentStep } = useOnboarding();

  return (
    <View style={styles.container}>
      {currentStep === 1 && <StepWelcome />}
      {currentStep === 2 && <StepLocation />}
      {currentStep === 3 && <StepPreferences />}
      {currentStep === 4 && <StepNotifications />}
      {currentStep === 5 && <LoginScreen />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
});
