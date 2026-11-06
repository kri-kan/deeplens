export interface RawProductMedia {
  id?: string;
  storagePath?: string;
  url?: string;
  thumbnailUrl?: string;
  mediaType?: number | 'image' | 'video';
  isDefault?: boolean;
}

export interface ResolvedPdpMediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: 'image' | 'video';
  isDefault?: boolean;
}

export interface PdpMediaUrlResolvers {
  getRawMediaUrl: (mediaId: string) => string;
  getMediaUrlByPath: (path: string) => string;
  getThumbnailUrl: (mediaId: string, spec?: 'icon' | 'medium' | 'large') => string;
  getThumbnailUrlByPath: (path: string, spec?: 'icon' | 'medium' | 'large') => string;
}

export const defaultMediaUrlResolvers: PdpMediaUrlResolvers = {
  getRawMediaUrl: (mediaId: string) => `/api/v1/catalog/media/${mediaId}/raw`,
  getMediaUrlByPath: (path: string) => `/api/v1/Attachment/download?path=${encodeURIComponent(path.replace(/^\/+/, ''))}`,
  getThumbnailUrl: (mediaId: string, spec = 'medium') => `/api/v1/catalog/media/${mediaId}/thumbnail?spec=${spec}`,
  getThumbnailUrlByPath: (path: string, spec = 'medium') => `/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(path)}&spec=${spec}`,
};

/**
 * Checks whether a raw media item represents a video asset.
 * Handles integer mediaType (2 = video, 1 = image) or string 'video' | 'image'.
 */
export function isVideoMediaItem(m: RawProductMedia): boolean {
  return m.mediaType === 2 || m.mediaType === 'video';
}

/**
 * Resolves a raw catalog/product media item into a clean ResolvedPdpMediaItem for Admin PDP.
 *
 * Critical rule:
 * For videos:
 * - url MUST point to the raw streaming video URL (/api/v1/catalog/media/{id}/raw or /api/v1/Attachment/download?path=)
 * - thumbnailUrl points to the static image thumbnail for poster/preview rendering
 *
 * For images:
 * - url points to the large high-resolution thumbnail
 * - thumbnailUrl points to the medium thumbnail
 */
export function resolvePdpMediaItem(
  m: RawProductMedia,
  resolvers: PdpMediaUrlResolvers = defaultMediaUrlResolvers
): ResolvedPdpMediaItem {
  const isVideo = isVideoMediaItem(m);
  const hasValidId = Boolean(m.id && m.id !== '00000000-0000-0000-0000-000000000000');
  const id = m.id || (m.storagePath ? m.storagePath : `media-${Date.now()}`);

  let mediaUrl: string;
  let thumbUrl: string | undefined;

  if (isVideo) {
    // 1. Playable Video URL
    if (hasValidId && m.id) {
      mediaUrl = resolvers.getRawMediaUrl(m.id);
    } else if (m.storagePath) {
      mediaUrl = resolvers.getMediaUrlByPath(m.storagePath);
    } else {
      mediaUrl = m.url || '';
    }

    // 2. Poster Image Thumbnail
    if (hasValidId && m.id) {
      thumbUrl = resolvers.getThumbnailUrl(m.id, 'large');
    } else if (m.storagePath) {
      thumbUrl = resolvers.getThumbnailUrlByPath(m.storagePath, 'large');
    } else {
      thumbUrl = m.thumbnailUrl || undefined;
    }
  } else {
    // 1. High-Res Image Display
    if (hasValidId && m.id) {
      mediaUrl = resolvers.getThumbnailUrl(m.id, 'large');
    } else if (m.storagePath) {
      mediaUrl = resolvers.getThumbnailUrlByPath(m.storagePath, 'large');
    } else {
      mediaUrl = m.url || 'https://via.placeholder.com/400';
    }

    // 2. Medium Thumbnail for Strips/Cards
    if (hasValidId && m.id) {
      thumbUrl = resolvers.getThumbnailUrl(m.id, 'medium');
    } else if (m.storagePath) {
      thumbUrl = resolvers.getThumbnailUrlByPath(m.storagePath, 'medium');
    } else {
      thumbUrl = m.thumbnailUrl || undefined;
    }
  }

  return {
    id,
    url: mediaUrl,
    thumbnailUrl: thumbUrl,
    mediaType: isVideo ? 'video' : 'image',
    isDefault: m.isDefault,
  };
}

/**
 * Returns the appropriate image URI for an Image component displaying this media item.
 * For videos, returns the poster image (thumbnailUrl) so image loaders like expo-image
 * do not attempt to decode raw mp4 video streams as images.
 */
export function getCarouselPosterUri(item: ResolvedPdpMediaItem): string {
  if (item.mediaType === 'video') {
    return item.thumbnailUrl || item.url;
  }
  return item.url || item.thumbnailUrl || '';
}
