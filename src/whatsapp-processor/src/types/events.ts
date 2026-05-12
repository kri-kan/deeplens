/**
 * Kafka Event Types for DeepLens Integration
 */

export interface ImageUploadedData {
    imageId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    contentType: string;
    category?: string;
    subCategory?: string;
    uploadedBy?: string;
    metadata?: {
        originalFileName?: string;
        format?: string;
        source?: string;
        chatJid?: string;
        messageId?: string;
        sender?: string | null;
        timestamp?: number;
        groupId?: string | null;
    };
}

export interface ImageUploadedEvent {
    eventId: string;
    eventType: 'image.uploaded';
    eventVersion: string;
    timestamp: string;
    tenantId: string;
    correlationId?: string;
    data: ImageUploadedData;
    processingOptions: {
        targetThumbnailSizes: string[];
        thumbnailFormat: string;
        thumbnailQuality: number;
        retention: string;
    };
}
