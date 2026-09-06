import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { mockLocationService, DeliveryLocation } from '../services/mock/mockLocationService';

export type PermissionStatus = 'idle' | 'prompt' | 'granted' | 'denied';

interface PermissionsContextValue {
  locationStatus: PermissionStatus;
  notificationStatus: PermissionStatus;
  currentLocation: DeliveryLocation | null;
  isLocationPrimingOpen: boolean;
  isNotificationPrimingOpen: boolean;
  openLocationPriming: () => void;
  closeLocationPriming: () => void;
  openNotificationPriming: () => void;
  closeNotificationPriming: () => void;
  requestLocationPermission: () => Promise<DeliveryLocation | null>;
  requestNotificationPermission: () => Promise<boolean>;
  setManualPincode: (pincode: string) => Promise<DeliveryLocation | null>;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  locationStatus: 'idle',
  notificationStatus: 'idle',
  currentLocation: null,
  isLocationPrimingOpen: false,
  isNotificationPrimingOpen: false,
  openLocationPriming: () => {},
  closeLocationPriming: () => {},
  openNotificationPriming: () => {},
  closeNotificationPriming: () => {},
  requestLocationPermission: async () => null,
  requestNotificationPermission: async () => false,
  setManualPincode: async () => null,
});

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('idle');
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('idle');
  const [currentLocation, setCurrentLocation] = useState<DeliveryLocation | null>(null);
  const [isLocationPrimingOpen, setIsLocationPrimingOpen] = useState(false);
  const [isNotificationPrimingOpen, setIsNotificationPrimingOpen] = useState(false);

  useEffect(() => {
    // Restore saved location if available in localStorage
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = localStorage.getItem('vayyari_delivery_location');
      if (saved) {
        try {
          setCurrentLocation(JSON.parse(saved));
          setLocationStatus('granted');
        } catch {}
      }
      if ('Notification' in window) {
        if (Notification.permission === 'granted') setNotificationStatus('granted');
        else if (Notification.permission === 'denied') setNotificationStatus('denied');
      }
    }
  }, []);

  const openLocationPriming = () => setIsLocationPrimingOpen(true);
  const closeLocationPriming = () => setIsLocationPrimingOpen(false);
  const openNotificationPriming = () => setIsNotificationPrimingOpen(true);
  const closeNotificationPriming = () => setIsNotificationPrimingOpen(false);

  const requestLocationPermission = async (): Promise<DeliveryLocation | null> => {
    closeLocationPriming();
    setLocationStatus('prompt');

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const loc = await mockLocationService.reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
            setCurrentLocation(loc);
            setLocationStatus('granted');
            localStorage.setItem('vayyari_delivery_location', JSON.stringify(loc));
            resolve(loc);
          },
          (err) => {
            console.warn('Geolocation denied or failed, falling back to Hyderabad default:', err);
            setLocationStatus('denied');
            resolve(null);
          },
          { timeout: 8000 }
        );
      });
    }

    // Default simulation fallback for mobile / offline
    const fallback = await mockLocationService.lookupPincode('500081');
    if (fallback) {
      setCurrentLocation(fallback);
      setLocationStatus('granted');
    }
    return fallback;
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    closeNotificationPriming();
    setNotificationStatus('prompt');

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationStatus('granted');
          return true;
        }
        setNotificationStatus('denied');
        return false;
      } catch (err) {
        console.warn('Notification permission error:', err);
        setNotificationStatus('denied');
        return false;
      }
    }

    setNotificationStatus('granted');
    return true;
  };

  const setManualPincode = async (pincode: string): Promise<DeliveryLocation | null> => {
    const loc = await mockLocationService.lookupPincode(pincode);
    if (loc) {
      setCurrentLocation(loc);
      setLocationStatus('granted');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem('vayyari_delivery_location', JSON.stringify(loc));
      }
    }
    return loc;
  };

  return (
    <PermissionsContext.Provider
      value={{
        locationStatus,
        notificationStatus,
        currentLocation,
        isLocationPrimingOpen,
        isNotificationPrimingOpen,
        openLocationPriming,
        closeLocationPriming,
        openNotificationPriming,
        closeNotificationPriming,
        requestLocationPermission,
        requestNotificationPermission,
        setManualPincode,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
