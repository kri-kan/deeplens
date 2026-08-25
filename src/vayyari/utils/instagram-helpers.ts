import { Linking } from 'react-native';
import {
    InstagramMediaType,
    normalizeData,
    normalizeProfile,
} from '@/services/instagram.service';
import type { MediaEntry } from '@/types/products';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


export interface InstagramLink {
    id: string;
    postId: string;
    productId: string;
    productTitle: string;
    productCode: string;
    vendorPrice: number;
    linkType: string;
    media: MediaEntry[] | null;
    mediaJson?: string;
}

export { normalizeData, normalizeProfile };

export const isVideo = (m: any): boolean => {
    if (!m) return false;
    const normalized = normalizeData(m);
    return normalized.mediaType === InstagramMediaType.VIDEO;
};

export const getMediaUri = (m: any, spec?: 'icon' | 'medium' | 'large'): string => {
    const normalized = normalizeData(m);
    if (!normalized) return '';

    let path = normalized.storagePath;
    if (path) {
        const baseUrl = getSearchApiUrl() || '';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        if (spec) {
            let thumbPath = path;
            if (thumbPath.toLowerCase().endsWith('.mp4') || thumbPath.toLowerCase().endsWith('.mov')) {
                thumbPath = thumbPath
                    .replace(/_full\.(mp4|mov)$/i, '.jpg')
                    .replace(/_child\.(mp4|mov)$/i, '.jpg')
                    .replace(/\.(mp4|mov)$/i, '.jpg');
            }
            return `${cleanBaseUrl}/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(thumbPath)}&spec=${spec}`;
        }

        // Both images and videos use the Attachment/download endpoint
        return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }

    return normalized.mediaUrl || normalized.thumbnailUrl || '';
};

export const getProfilePicUri = (profileOrPath: any): string | null => {
    if (!profileOrPath) return null;

    if (typeof profileOrPath === 'string') {
        if (profileOrPath.startsWith('http://') || profileOrPath.startsWith('https://')) {
            return profileOrPath;
        }
        const baseUrl = getSearchApiUrl() || '';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        if (profileOrPath.startsWith('/api/')) {
            return `${cleanBaseUrl}${profileOrPath}`;
        }
        return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(profileOrPath)}`;
    }

    const path = profileOrPath.storagePath || profileOrPath.StoragePath;
    if (path) {
        const baseUrl = getSearchApiUrl() || '';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }

    const picUrl = profileOrPath.profilePictureUrl || profileOrPath.ProfilePictureUrl || profileOrPath.profile_pic_url || profileOrPath.ownerProfilePictureUrl;
    if (picUrl) {
        if (picUrl.startsWith('/') && !picUrl.startsWith('//')) {
            const baseUrl = getSearchApiUrl() || '';
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            return `${cleanBaseUrl}${picUrl}`;
        }
        return picUrl;
    }

    return null;
};

/**
 * Extracts the base identifier from a storage path filename.
 * e.g. "instagram/123/17885715813537486_full.mp4" → "17885715813537486"
 */
export const getBaseId = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0].split('_')[0];
};

export const getInstagramPostUrl = (item: any): string => {
  if (!item) return 'https://www.instagram.com';
  const candidate = item.postUrl || item.permalink || item.url;
  if (candidate && typeof candidate === 'string' && candidate.startsWith('http') && !candidate.includes('cdninstagram') && !candidate.includes('/api/v1/Attachment/')) {
    return candidate;
  }
  if (item.ownerUsername) {
    return `https://www.instagram.com/${item.ownerUsername.replace(/^@/, '')}/`;
  }
  return 'https://www.instagram.com';
};

export const openInstagramPost = async (item: any): Promise<void> => {
  if (!item) return;
  const webUrl = getInstagramPostUrl(item);
  const platformId = item.platformVideoId || item.id;
  const isNumericId = platformId && /^\d+$/.test(String(platformId));
  const nativeUrl = isNumericId ? `instagram://media?id=${platformId}` : '';

  try {
    if (nativeUrl && (await Linking.canOpenURL(nativeUrl))) {
      await Linking.openURL(nativeUrl).catch(() => Linking.openURL(webUrl));
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (e) {
    if (webUrl) {
      await Linking.openURL(webUrl).catch(() => {});
    }
  }
};
