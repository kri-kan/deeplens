import apiClient from './apiClient';

export interface ImageDto {
    id: string;
    storagePath: string;
    status: number;
    width?: number;
    height?: number;
    uploadedAt: string;
    sku?: string;
    productTitle?: string;
}

export const imageService = {
    async listImages(page: number = 1, pageSize: number = 50, tenantId?: string): Promise<ImageDto[]> {
        const params: any = { page, pageSize };
        if (tenantId) {
            params.tenant = tenantId;
        }
        const response = await apiClient.get<ImageDto[]>(`/api/v1/catalog/images`, {
            params,
        });
        return response.data;
    },

    getThumbnailUrl(imageId: string, tenantId: string): string {
        // We pass tenantId as query param because the endpoint is AllowAnonymous and needs it to find the file
        return `${apiClient.defaults.baseURL}/api/v1/catalog/images/${imageId}/thumbnail?tenant=${tenantId}`;
    }
};

export default imageService;
