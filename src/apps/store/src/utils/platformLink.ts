import { Linking, Alert, Platform } from 'react-native';

/**
 * Extracts a clean Instagram username without '@', protocol, domain, or URL path.
 */
export function extractInstagramHandle(handle?: string | null): string {
  if (!handle) return '';
  let clean = handle.trim();

  // Remove protocol and domains
  clean = clean.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  clean = clean.replace(/^https?:\/\/(www\.)?ig\.me\/m\//i, '');
  clean = clean.replace(/^(www\.)?instagram\.com\//i, '');
  clean = clean.replace(/^(www\.)?ig\.me\/m\//i, '');

  if (clean.includes('instagram.com/')) {
    clean = clean.split('instagram.com/')[1];
  }

  // Strip query parameters and hash
  clean = clean.split('?')[0].split('#')[0];

  // Strip path segments and slashes
  clean = clean.split('/')[0].trim();

  // Strip leading '@'
  clean = clean.replace(/^@+/, '').trim();

  return clean;
}

/**
 * Formats a raw handle or URL for clean UI display.
 * For Instagram: turns full URLs (e.g. 'https://instagram.com/user/') into '@user'.
 * For WhatsApp / other: returns handle trimmed.
 */
export function formatDisplayHandle(source?: string | null, handle?: string | null): string {
  if (!handle) return '';
  const isInstagram = source?.toLowerCase() === 'instagram';
  if (isInstagram) {
    const clean = extractInstagramHandle(handle);
    return clean ? `@${clean}` : '';
  }
  return handle.trim();
}

/**
 * Normalizes phone or username and opens WhatsApp or Instagram via native deep links with web fallbacks.
 */
export async function openPlatformHandle(
  source?: string | null,
  handle?: string | null,
  showAlertOnMissing: boolean = true
): Promise<boolean> {
  if (!source) return false;
  const lowerSource = source.toLowerCase();
  const isWhatsApp = lowerSource === 'whatsapp';
  const isInstagram = lowerSource === 'instagram';

  if (!isWhatsApp && !isInstagram) return false;

  const rawHandle = (handle || '').trim();

  if (!rawHandle) {
    if (showAlertOnMissing) {
      const label = isWhatsApp ? 'phone number' : 'Instagram handle';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`No ${label} found for this order.`);
      } else {
        Alert.alert('Missing Contact', `No ${label} found for this order.`);
      }
    }
    return false;
  }

  try {
    if (isWhatsApp) {
      const digits = rawHandle.replace(/\D/g, '');
      const finalPhone = digits.length === 10 ? `91${digits}` : digits;

      if (!finalPhone) return false;

      // In web browser (Storybook or Web app)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(`https://wa.me/${finalPhone}`, '_blank');
        return true;
      }

      // Native mobile: try native app scheme first, fallback to https://wa.me
      const appUrl = `whatsapp://send?phone=${finalPhone}`;
      const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(`https://wa.me/${finalPhone}`);
      }
      return true;
    }

    if (isInstagram) {
      const username = extractInstagramHandle(rawHandle);

      if (!username) return false;

      const igMeUrl = `https://ig.me/m/${username}`;
      const appProfileUrl = `instagram://user?username=${username}`;
      const webUrl = `https://instagram.com/${username}`;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(igMeUrl, '_blank');
        return true;
      }

      // Native mobile: try Direct Messages ig.me or app scheme, fallback to profile
      const canOpenIgMe = await Linking.canOpenURL(igMeUrl).catch(() => false);
      if (canOpenIgMe) {
        await Linking.openURL(igMeUrl);
      } else {
        const canOpenProfile = await Linking.canOpenURL(appProfileUrl).catch(() => false);
        if (canOpenProfile) {
          await Linking.openURL(appProfileUrl);
        } else {
          await Linking.openURL(webUrl);
        }
      }
      return true;
    }
  } catch (error) {
    console.error('[platformLink] Deep link navigation failed:', error);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Could not open platform app');
    } else {
      Alert.alert('Error', 'Could not open platform app');
    }
    return false;
  }

  return false;
}
