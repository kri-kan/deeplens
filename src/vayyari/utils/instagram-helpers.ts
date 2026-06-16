import {
    InstagramMediaType,
    normalizeData,
    normalizeProfile,
} from '@/services/instagram.service';
import type { MediaEntry } from '@/types/products';

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
        const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL || '';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        if (spec && (path.toLowerCase().endsWith('.mp4') || path.toLowerCase().endsWith('.mov'))) {
            path = path.replace(/_full\.(mp4|mov)$/i, '.jpg')
                       .replace(/_child\.(mp4|mov)$/i, '.jpg')
                       .replace(/\.(mp4|mov)$/i, '.jpg');
        }

        const isImage = !path.toLowerCase().endsWith('.mp4') && !path.toLowerCase().endsWith('.mov');
        if (spec && isImage) {
            return `${cleanBaseUrl}/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(path)}&spec=${spec}`;
        }

        // Both images and videos use the Attachment/download endpoint
        return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }

    return normalized.mediaUrl || normalized.thumbnailUrl || '';
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
