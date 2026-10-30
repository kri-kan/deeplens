import React from 'react';
import {
  ImageViewerModal,
  ImageViewerModalProps,
} from '@/components/tamagui-ui/molecules/ImageViewerModal';
import { isVideoUrl } from '@/components/tamagui-ui/atoms/VisualLensButton';

export { isVideoUrl };

export type ImagePreviewModalProps = ImageViewerModalProps;

/**
 * ImagePreviewModal
 * Consolidated facade delegating to the unified canonical ImageViewerModal.
 * Provides multi-image pinch-to-zoom, video playback, and automatic VisualLensButton discovery.
 */
export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = (props) => {
  return <ImageViewerModal {...props} />;
};
