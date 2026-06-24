import apiClient from './apiClient';

export interface MergeCandidateDto {
  id: string;
  productAId: string;
  productBId: string;
  similarityScore: number;
  status: string;
  detectedAt: string;
  productATitle: string;
  productASku: string;
  productAImagePath: string;
  productAMediaId: string;
  productBTitle: string;
  productBSku: string;
  productBImagePath: string;
  productBMediaId: string;
}

export const whatsAppProductService = {
  async listMergeCandidates(): Promise<MergeCandidateDto[]> {
    const response = await apiClient.get<MergeCandidateDto[]>('/api/v1/whatsapp/products/merge-candidates');
    return response.data;
  },

  async mergeProducts(productAId: string, productBId: string, candidateId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/api/v1/whatsapp/products/merge', {
      productAId,
      productBId,
      candidateId,
    });
    return response.data;
  },

  async dismissMerge(candidateId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/api/v1/whatsapp/products/dismiss-merge', {
      candidateId,
    });
    return response.data;
  },
};

export default whatsAppProductService;
