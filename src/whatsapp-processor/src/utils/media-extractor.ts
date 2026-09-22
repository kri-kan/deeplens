import { MediaType } from '../clients/media.client';

export interface ExtractedMediaPayload {
    type: MediaType;
    mediaKeyName: string;
    payload: any;
}

/**
 * Extracts inner media payload from Baileys message metadata,
 * handling various wrapper types (ephemeral, viewOnce, documentWithCaption).
 */
export function extractMediaPayload(metadata: any): ExtractedMediaPayload | null {
    if (!metadata || typeof metadata !== 'object') {
        return null;
    }

    let targetMsg = metadata.message || metadata;
    if (targetMsg.ephemeralMessage?.message) targetMsg = targetMsg.ephemeralMessage.message;
    if (targetMsg.viewOnceMessage?.message) targetMsg = targetMsg.viewOnceMessage.message;
    if (targetMsg.viewOnceMessageV2?.message) targetMsg = targetMsg.viewOnceMessageV2.message;
    if (targetMsg.documentWithCaptionMessage?.message) targetMsg = targetMsg.documentWithCaptionMessage.message;

    if (targetMsg.imageMessage) {
        return { type: 'photo', mediaKeyName: 'imageMessage', payload: targetMsg.imageMessage };
    }
    if (targetMsg.videoMessage) {
        return { type: 'video', mediaKeyName: 'videoMessage', payload: targetMsg.videoMessage };
    }
    if (targetMsg.audioMessage) {
        return { type: 'audio', mediaKeyName: 'audioMessage', payload: targetMsg.audioMessage };
    }
    if (targetMsg.documentMessage) {
        const doc = targetMsg.documentMessage;
        const mimetype = (doc.mimetype || '').toLowerCase();
        const fileName = (doc.fileName || '').toLowerCase();
        const isVideo = mimetype.startsWith('video/') || mimetype === 'video/quicktime' || fileName.endsWith('.mov') || fileName.endsWith('.mp4');
        if (isVideo) {
            return { type: 'video', mediaKeyName: 'documentMessage', payload: targetMsg.documentMessage };
        }
        return { type: 'document', mediaKeyName: 'documentMessage', payload: targetMsg.documentMessage };
    }
    if (targetMsg.stickerMessage) {
        return { type: 'sticker', mediaKeyName: 'stickerMessage', payload: targetMsg.stickerMessage };
    }

    return null;
}

/**
 * Clamps backfill batch size to safe boundaries [1, 200].
 */
export function clampBackfillLimit(limit?: number): number {
    if (typeof limit !== 'number' || isNaN(limit)) {
        return 50;
    }
    return Math.min(Math.max(1, Math.floor(limit)), 200);
}
