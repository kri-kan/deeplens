import { Linking, Alert, Platform } from 'react-native';
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

export const getMediaFallbackUri = (m: any): string => {
    const normalized = normalizeData(m);
    if (!normalized) return '';
    return normalized.thumbnailUrl || normalized.mediaUrl || '';
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

/**
 * Instagram Base64 URL character set for shortcode <-> media ID encoding.
 */
const INSTAGRAM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Converts an Instagram post shortcode (e.g. "DcOHkPJndeD") to its internal numeric media ID.
 * Example: "DcOHkPJndeD" -> "3967141598254192515"
 */
export const shortcodeToMediaId = (shortcode: string): string => {
    if (!shortcode || typeof shortcode !== 'string') return '';
    const clean = shortcode.trim().replace(/^\/+|\/+$/g, '');
    try {
        let id = 0n;
        for (let i = 0; i < clean.length; i++) {
            const char = clean[i];
            const index = INSTAGRAM_ALPHABET.indexOf(char);
            if (index === -1) return '';
            id = (id * 64n) + BigInt(index);
        }
        return id.toString();
    } catch {
        return '';
    }
};

/**
 * Converts an Instagram numeric media ID to its shortcode.
 * Example: "3967141598254192515" -> "DcOHkPJndeD"
 */
export const mediaIdToShortcode = (mediaId: string): string => {
    if (!mediaId || typeof mediaId !== 'string') return '';
    try {
        let id = BigInt(mediaId.trim());
        if (id <= 0n) return '';
        let shortcode = '';
        while (id > 0n) {
            const remainder = Number(id % 64n);
            id = id / 64n;
            shortcode = INSTAGRAM_ALPHABET[remainder] + shortcode;
        }
        return shortcode;
    } catch {
        return '';
    }
};

/**
 * Resolves the direct Instagram web URL for a post item or shortcode.
 * Returns null if no valid post URL or valid shortcode is found.
 * NOTE: Never falls back to generic homepages, user profiles, or database UUIDs.
 */
export const getInstagramPostUrl = (item: any): string | null => {
    if (!item) return null;

    if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            if (/instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(trimmed)) {
                return trimmed;
            }
            return null;
        }
        // Only accept actual Instagram shortcode patterns (5-25 chars, not a UUID)
        if (/^[A-Za-z0-9_-]{5,25}$/.test(trimmed) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) {
            return `https://www.instagram.com/p/${trimmed}/`;
        }
        return null;
    }

    // Check candidate post URL fields
    const candidate = item.postUrl || item.PostUrl || item.permalink || item.Permalink || item.url || item.Url || item.post_url;
    if (candidate && typeof candidate === 'string' && candidate.startsWith('http') && !candidate.includes('cdninstagram') && !candidate.includes('/api/v1/Attachment/')) {
        return candidate;
    }

    // Check explicit shortcode (must not be a UUID)
    const rawCode = item.shortcode || item.code;
    if (rawCode && typeof rawCode === 'string') {
        const cleanCode = rawCode.trim();
        if (/^[A-Za-z0-9_-]{5,25}$/.test(cleanCode) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(cleanCode)) {
            return `https://www.instagram.com/p/${cleanCode}/`;
        }
    }

    return null;
};

/**
 * Opens an Instagram post or reel in the native Instagram app if available,
 * falling back gracefully to the verified web URL if the app is absent.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. DO NOT use `instagram://media?id=${mediaId}`. Opening via numeric media ID poisons
 *    Instagram's Story Composer sticker payload with numeric IDs (e.g. /p/3957543988533504451),
 *    which return 404 on the web.
 * 2. On Android, use explicit intent targeting `com.instagram.android` with canonical shortcode URL
 *    (`intent://www.instagram.com/${postType}/${shortcode}/#Intent;package=com.instagram.android;scheme=https;end`).
 *    This forces Android to bypass Chrome/browser routing while preserving the canonical shortcode.
 * 3. On iOS, use `instagram://${postType}/${shortcode}`.
 * 4. See docs/deeplens/guides/INSTAGRAM_DEEP_LINKING_AND_URL_ROUTING.md for full guide.
 */
export const openInstagramPost = async (item: any): Promise<void> => {
    if (!item) return;

    let webUrl: string | null = null;
    let shortcode = '';
    let postType = 'p';

    if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const match = trimmed.match(/(?:https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+))/i);
            if (match) {
                postType = match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase();
                shortcode = match[2];
                webUrl = trimmed;
            }
        } else if (/^[A-Za-z0-9_-]{5,25}$/.test(trimmed) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) {
            shortcode = trimmed;
            webUrl = `https://www.instagram.com/p/${shortcode}/`;
        }
    } else {
        webUrl = getInstagramPostUrl(item);
        const rawCode = item.shortcode || item.code;
        if (rawCode && typeof rawCode === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawCode)) {
            shortcode = rawCode.trim();
        }
        if (webUrl) {
            const match = webUrl.match(/(?:https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+))/i);
            if (match) {
                postType = match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase();
                if (!shortcode) {
                    shortcode = match[2];
                }
            }
        } else if (shortcode) {
            webUrl = `https://www.instagram.com/p/${shortcode}/`;
        }
    }

    // Strictly validate that we have a real post link before taking any action
    if (!webUrl && !shortcode) {
        console.warn('[openInstagramPost] No valid Instagram post URL or shortcode found for item:', item);
        Alert.alert('Unavailable', 'No valid Instagram post link is available for this item.');
        return;
    }

    if (!webUrl && shortcode) {
        webUrl = `https://www.instagram.com/${postType}/${shortcode}/`;
    }

    // Build candidate URIs to launch native Instagram app directly
    const candidateUris: string[] = [];

    if (Platform.OS === 'android' && shortcode) {
        // Direct intent targeting Instagram package with canonical HTTPS post URL
        // Forces Android to open the Instagram native app directly without browser redirect
        candidateUris.push(`intent://www.instagram.com/${postType}/${shortcode}/#Intent;package=com.instagram.android;scheme=https;end`);
        if (postType !== 'p') {
            candidateUris.push(`intent://www.instagram.com/p/${shortcode}/#Intent;package=com.instagram.android;scheme=https;end`);
        }
    }

    if (shortcode) {
        candidateUris.push(`instagram://${postType}/${shortcode}`);
        if (postType !== 'p') {
            candidateUris.push(`instagram://p/${shortcode}`);
        }
    }

    // Try candidate native app URIs first
    for (const uri of candidateUris) {
        try {
            const canOpen = await Linking.canOpenURL(uri).catch(() => false);
            if (canOpen) {
                await Linking.openURL(uri);
                return;
            }
        } catch {
            // continue
        }
    }

    // Direct attempt on primary candidate if canOpenURL check was restricted by OS
    if (candidateUris.length > 0) {
        try {
            await Linking.openURL(candidateUris[0]);
            return;
        } catch {
            // Instagram app is not installed
        }
    }

    // Final fallback to web URL
    try {
        if (webUrl) {
            await Linking.openURL(webUrl);
        }
    } catch (err) {
        console.warn('[openInstagramPost] Failed to open URL:', webUrl, err);
        Alert.alert('Error', 'Could not open Instagram link.');
    }
};
