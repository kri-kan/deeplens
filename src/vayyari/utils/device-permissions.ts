import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

const PERMISSION_PROMPTED_KEY = 'vayyari_device_permissions_prompted';

/**
 * Just-in-time permission request when the user performs a media action (e.g. download/save).
 * If permission was previously denied permanently, opens app system settings.
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const current = await MediaLibrary.getPermissionsAsync();
    if (current.granted) return true;

    if (current.canAskAgain) {
      const requested = await MediaLibrary.requestPermissionsAsync();
      return requested.granted;
    }

    Alert.alert(
      'Storage Permission Required',
      'Vayyari needs storage permission to save media to your gallery. Please enable Storage/Photos permission in your app settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  } catch (err) {
    console.warn('[DevicePermissions] Error requesting media library permission:', err);
    return false;
  }
}

/**
 * Initial permission check on first app install/launch.
 * Prompts once gracefully; if the user ignores/dismisses, it won't prompt repeatedly on every launch.
 */
export async function ensureInitialPermissions(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const alreadyPrompted = await AsyncStorage.getItem(PERMISSION_PROMPTED_KEY);
    if (alreadyPrompted) return;

    const current = await MediaLibrary.getPermissionsAsync();
    if (!current.granted && current.canAskAgain) {
      await MediaLibrary.requestPermissionsAsync();
    }
    await AsyncStorage.setItem(PERMISSION_PROMPTED_KEY, 'true');
  } catch (err) {
    console.warn('[DevicePermissions] Initial permission prompt skipped:', err);
  }
}
