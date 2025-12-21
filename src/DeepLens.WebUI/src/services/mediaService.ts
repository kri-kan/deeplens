import apiClient from './apiClient';

export interface MediaDto {
    id: string;
    storagePath: string;
    mediaType: number; // 1=Image, 2=Video
    status: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    thumbnailPath?: string;
    previewPath?: string;
    mimeType?: string;
    uploadedAt: string;
    sku?: string;
    productTitle?: string;
}

export const mediaService = {
    async listMedia(page: number = 1, pageSize: number = 50, tenantId?: string, type?: number): Promise<MediaDto[]> {
        const params: any = { page, pageSize };
        if (tenantId) {
            params.tenant = tenantId;
        }
        if (type !== undefined) {
            params.type = type;
        }
        const response = await apiClient.get<MediaDto[]>(`/api/v1/catalog/media`, {
            params,
        });
        return response.data;
    },

    getThumbnailUrl(mediaId: string, tenantId: string): string {
        return `${apiClient.defaults.baseURL}/api/v1/catalog/media/${mediaId}/thumbnail?tenant=${tenantId}`;
    },

    getPreviewUrl(mediaId: string, tenantId: string): string {
        return `${apiClient.defaults.baseURL}/api/v1/catalog/media/${mediaId}/preview?tenant=${tenantId}`;
    },

    getRawUrl(mediaId: string, tenantId: string): string {
        return `${apiClient.defaults.baseURL}/api/v1/catalog/media/${mediaId}/raw?tenant=${tenantId}`;
    }
};

export default mediaService;
