import { useState, useCallback } from 'react';
import { productService } from '@/services/productService';
import { wrapInSpan } from '@/utils/telemetry';
import type { RecordShareRequest } from '@/types/products';

export const useProductSharing = (productId: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareDescription = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      return await wrapInSpan('generate-share-description', async () => {
        const response = await productService.generateShareDescription(productId);
        return response.description;
      });
    } catch (err) {
      console.error('Failed to generate description:', err);
      setError('Failed to generate description');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [productId]);

  const recordShare = useCallback(async (request: RecordShareRequest) => {
    setIsRecording(true);
    setError(null);
    try {
      return await wrapInSpan('record-product-share', async () => {
        return await productService.recordShare(productId, request);
      });
    } catch (err) {
      console.error('Failed to record share:', err);
      setError('Failed to record share');
      throw err;
    } finally {
      setIsRecording(false);
    }
  }, [productId]);

  return {
    isGenerating,
    isRecording,
    error,
    generateShareDescription,
    recordShare,
  };
};
