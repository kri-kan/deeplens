export interface MediaDto {
  id: string;
  storagePath: string;
  thumbnailPath?: string;
  previewPath?: string;
  fileName: string;
  mimeType: string;
  mediaType: MediaType;
  sizeBytes: number;
  uploadedAt: string;
  sellerId?: string;
  sku?: string;
  isDefault?: boolean;
}

export enum MediaType {
  IMAGE = 1,
  VIDEO = 2
}

export interface SearchFilters {
  page?: number;
  pageSize?: number;
  type?: MediaType;
  tenant?: string;
}

export interface UploadImageResponse {
  imageId: string;
  status: string;
  message: string;
}

/**
 * Mirrors InstagramProfileDto from backend.
 */
export interface InstagramProfileDto {
  userId: string;
  username: string;
  name: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  externalUrl?: string;
  isPrivate: boolean;
  isVerified: boolean;
  profilePictureUrl: string;
  storagePath?: string;
  isActive: boolean;
  isOwnAccount: boolean;
  isDataDeleted: boolean;
  lastSyncedAt?: string;
}

/**
 * Mirrors InstagramPostDto from backend.
 */
export interface InstagramPostDto {
  shortcode: string;
  caption?: string;
  timestamp: string;
  mediaUrl: string;
  isVideo: boolean;
  likeCount: number;
  commentCount: number;
}
