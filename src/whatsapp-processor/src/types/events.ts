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

export interface WhatsAppGroupMediaFile {
    mediaId: string;
    messageId: string;
    mediaUrl: string;
    mediaType: string;
    mimeType: string;
}

export interface WhatsAppGroupProductCreateEvent {
    eventId: string;
    eventType: 'whatsapp.group.product.create';
    groupId: string;
    jid: string;
    tenantId: string;
    vendorId: string;
    description: string;
    mediaFiles: WhatsAppGroupMediaFile[];
    timestamp: string;
}

export interface WhatsAppGroupMediaAddedEvent {
    eventId: string;
    eventType: 'whatsapp.group.media.added';
    groupId: string;
    jid: string;
    tenantId: string;
    vendorId: string;
    mediaFiles: WhatsAppGroupMediaFile[];
    timestamp: string;
}

export interface WhatsAppGroupProductCreatedEvent {
    eventId: string;
    eventType: 'whatsapp.group.product.created';
    groupId: string;
    productId: string;
    listingId: string;
    category: string;
    subCategory: string;
    timestamp: string;
}

export interface WhatsAppGroupReprocessEvent {
    eventId: string;
    eventType: 'whatsapp.group.reprocess';
    groupId: string;
    reprocessType: 'split' | 'merge';
    targetGroupId?: string;
    timestamp: string;
}
