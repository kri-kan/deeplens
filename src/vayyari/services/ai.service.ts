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
  async generateTitle(description: string, context?: string, retries = 2): Promise<GenerateTitleResponse> {
    try {
      return await searchApiClient.post<GenerateTitleResponse>('/api/v1/ai/generate-title', {
        description,
        context
      });
    } catch (error) {
      if (retries > 0) {
        console.warn(`AI title generation failed, retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.generateTitle(description, context, retries - 1);
      }
      console.error('AI title generation failed after all retries:', error);
      throw error;
    }
  }

  async generateYoutubeTitle(description: string): Promise<string> {
    try {
      const response = await this.generateTitle(description, 'youtube_shorts');
      return response.title;
    } catch {
      // Fallback to original description if AI fails
      return description.substring(0, 100);
    }
  }
}

export const aiService = new AiService();
