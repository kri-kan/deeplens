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

export const getInstagramPostUrl = (item: any): string => {
    if (!item) return 'https://www.instagram.com';

    if (typeof item === 'string') {
        if (item.startsWith('http://') || item.startsWith('https://')) {
            return item;
        }
        return `https://www.instagram.com/p/${item.replace(/^\/+|\/+$/g, '')}/`;
    }

    const candidate = item.postUrl || item.PostUrl || item.permalink || item.Permalink || item.url || item.Url || item.post_url;
    if (candidate && typeof candidate === 'string' && candidate.startsWith('http') && !candidate.includes('cdninstagram') && !candidate.includes('/api/v1/Attachment/')) {
        return candidate;
    }
    const shortcode = item.shortcode || item.code;
    if (shortcode) {
        return `https://www.instagram.com/p/${shortcode}/`;
    }
    const username = item.ownerUsername || item.profileUsername || item.username;
    if (username) {
        return `https://www.instagram.com/${String(username).replace(/^@/, '')}/`;
    }
    return 'https://www.instagram.com';
};

/**
 * Opens an Instagram post, reel, or profile in the native Instagram app if available,
 * falling back gracefully to the web URL.
 */
export const openInstagramPost = async (item: any): Promise<void> => {
    if (!item) return;

    let webUrl = '';
    let shortcode = '';
    let postType = 'p';

    if (typeof item === 'string') {
        if (item.startsWith('http://') || item.startsWith('https://')) {
            webUrl = item;
            const match = item.match(/(?:https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+))/i);
            if (match) {
                postType = match[1].toLowerCase();
                shortcode = match[2];
            }
        } else if (/^[A-Za-z0-9_-]+$/.test(item.trim())) {
            shortcode = item.trim();
            webUrl = `https://www.instagram.com/p/${shortcode}/`;
        }
    } else {
        webUrl = getInstagramPostUrl(item);
        shortcode = item.shortcode || item.code || '';
        if (!shortcode && webUrl) {
            const match = webUrl.match(/(?:https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+))/i);
            if (match) {
                postType = match[1].toLowerCase();
                shortcode = match[2];
            }
        }
    }

    if (!webUrl || webUrl === 'https://www.instagram.com') return;

    // Build candidate native URIs
    const candidateUris: string[] = [];

    if (shortcode) {
        const mediaId = shortcodeToMediaId(shortcode);
        if (mediaId) {
            candidateUris.push(`instagram://media?id=${mediaId}`);
        }
        const normalizedType = postType === 'reels' ? 'reel' : postType;
        candidateUris.push(`instagram://${normalizedType}/${shortcode}`);
        if (normalizedType !== 'p') {
            candidateUris.push(`instagram://p/${shortcode}`);
        }
    }

    // Try candidate native URIs via canOpenURL check
    for (const uri of candidateUris) {
        try {
            const canOpen = await Linking.canOpenURL(uri).catch(() => false);
            if (canOpen) {
                await Linking.openURL(uri);
                return;
            }
        } catch {
            // Continue to next candidate
        }
    }

    // If canOpenURL was blocked by OS or returned false, attempt primary native URI once inside try-catch
    if (candidateUris.length > 0) {
        try {
            await Linking.openURL(candidateUris[0]);
            return;
        } catch {
            // Instagram app is not installed or unable to handle URI
        }
    }

    // Fallback to web URL
    try {
        await Linking.openURL(webUrl);
    } catch (err) {
        console.warn('[openInstagramPost] Failed to open URL:', webUrl, err);
    }
};
