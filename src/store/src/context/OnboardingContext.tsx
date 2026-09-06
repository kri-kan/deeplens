import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingContextValue {
  currentStep: OnboardingStep;
  hasCompletedOnboarding: boolean;
  selectedCategories: string[];
  deliveryPincode: string;
  deliveryCity: string;
  notificationsEnabled: boolean;
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  toggleCategory: (categoryId: string) => void;
  setLocation: (pincode: string, city: string) => void;
  setNotificationsOptIn: (enabled: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  currentStep: 1,
  hasCompletedOnboarding: false,
  selectedCategories: [],
  deliveryPincode: '',
  deliveryCity: '',
  notificationsEnabled: false,
  setStep: () => {},
  nextStep: () => {},
  prevStep: () => {},
  toggleCategory: () => {},
  setLocation: () => {},
  setNotificationsOptIn: () => {},
  completeOnboarding: () => {},
  resetOnboarding: () => {},
});

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['saree', 'silk']);
  const [deliveryPincode, setDeliveryPincode] = useState('500081');
  const [deliveryCity, setDeliveryCity] = useState('Hyderabad');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const completed = localStorage.getItem('vayyari_onboarding_completed') === 'true';
      setHasCompletedOnboarding(completed);

      const savedPrefs = localStorage.getItem('vayyari_preferred_categories');
      if (savedPrefs) {
        try { setSelectedCategories(JSON.parse(savedPrefs)); } catch {}
      }
    }
  }, []);

  const setStep = (step: OnboardingStep) => setCurrentStep(step);
  const nextStep = () => setCurrentStep((prev) => (Math.min(prev + 1, 5) as OnboardingStep));
  const prevStep = () => setCurrentStep((prev) => (Math.max(prev - 1, 1) as OnboardingStep));

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId];
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem('vayyari_preferred_categories', JSON.stringify(next));
      }
      return next;
    });
  };

  const setLocation = (pincode: string, city: string) => {
    setDeliveryPincode(pincode);
    setDeliveryCity(city);
  };

  const setNotificationsOptIn = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('vayyari_onboarding_completed', 'true');
    }
  };

  const resetOnboarding = () => {
    setHasCompletedOnboarding(false);
    setCurrentStep(1);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.removeItem('vayyari_onboarding_completed');
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        hasCompletedOnboarding,
        selectedCategories,
        deliveryPincode,
        deliveryCity,
        notificationsEnabled,
        setStep,
        nextStep,
        prevStep,
        toggleCategory,
        setLocation,
        setNotificationsOptIn,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
