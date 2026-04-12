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
