import { searchApiClient } from '../api/client';

export interface GenerateTitleRequest {
  description: string;
  context?: string;
}

export interface GenerateTitleResponse {
  title: string;
  model: string;
}

class AiService {
  generateTitle = async (description: string, context?: string): Promise<GenerateTitleResponse> => {
    return searchApiClient.post<GenerateTitleResponse>('/api/v1/ai/generate-title', {
      description,
      context
    });
  };
}

export const aiService = new AiService();
