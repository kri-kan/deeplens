import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractMediaPayload, clampBackfillLimit } from '../src/utils/media-extractor';
import { ConversationController } from '../src/controllers/conversation.controller';
import { getContentTypeFromFilename } from '../src/clients/media.client';

describe('Media Extractor & Payload Unwrapping', () => {
    test('extracts direct imageMessage payload correctly', () => {
        const metadata = {
            imageMessage: {
                url: 'https://mmg.whatsapp.net/v/test.enc',
                mimetype: 'image/jpeg',
                mediaKey: 'dummyKey123=='
            }
        };
        const result = extractMediaPayload(metadata);
        assert.ok(result);
        assert.equal(result.type, 'photo');
        assert.equal(result.mediaKeyName, 'imageMessage');
        assert.equal(result.payload.mimetype, 'image/jpeg');
    });

    test('extracts direct videoMessage payload correctly', () => {
        const metadata = {
            videoMessage: {
                url: 'https://mmg.whatsapp.net/v/video.enc',
                mimetype: 'video/mp4',
                seconds: 15
            }
        };
        const result = extractMediaPayload(metadata);
        assert.ok(result);
        assert.equal(result.type, 'video');
        assert.equal(result.mediaKeyName, 'videoMessage');
        assert.equal(result.payload.mimetype, 'video/mp4');
    });

    test('extracts nested ephemeralMessage and viewOnceMessage payloads', () => {
        const ephemeralMetadata = {
            ephemeralMessage: {
                message: {
                    imageMessage: {
                        url: 'https://mmg.whatsapp.net/v/ephemeral.enc',
                        mimetype: 'image/jpeg'
                    }
                }
            }
        };
        const res1 = extractMediaPayload(ephemeralMetadata);
        assert.ok(res1);
        assert.equal(res1.type, 'photo');

        const viewOnceMetadata = {
            viewOnceMessage: {
                message: {
                    videoMessage: {
                        url: 'https://mmg.whatsapp.net/v/viewonce.enc',
                        mimetype: 'video/mp4'
                    }
                }
            }
        };
        const res2 = extractMediaPayload(viewOnceMetadata);
        assert.ok(res2);
        assert.equal(res2.type, 'video');
    });

    test('extracts documentWithCaptionMessage payload correctly', () => {
        const docMetadata = {
            documentWithCaptionMessage: {
                message: {
                    documentMessage: {
                        fileName: 'catalog.pdf',
                        mimetype: 'application/pdf'
                    }
                }
            }
        };
        const result = extractMediaPayload(docMetadata);
        assert.ok(result);
        assert.equal(result.type, 'document');
        assert.equal(result.payload.fileName, 'catalog.pdf');
    });

    test('classifies documentMessage with .mov or video/quicktime as video', () => {
        const movDoc1 = {
            documentMessage: {
                fileName: 'video_clip.mov',
                mimetype: 'application/octet-stream'
            }
        };
        const res1 = extractMediaPayload(movDoc1);
        assert.ok(res1);
        assert.equal(res1.type, 'video');
        assert.equal(res1.mediaKeyName, 'documentMessage');
        assert.equal(res1.payload.fileName, 'video_clip.mov');

        const movDoc2 = {
            documentMessage: {
                fileName: 'clip.dat',
                mimetype: 'video/quicktime'
            }
        };
        const res2 = extractMediaPayload(movDoc2);
        assert.ok(res2);
        assert.equal(res2.type, 'video');
        assert.equal(res2.mediaKeyName, 'documentMessage');

        const mp4Doc = {
            documentMessage: {
                fileName: 'video.mp4',
                mimetype: 'video/mp4'
            }
        };
        const res3 = extractMediaPayload(mp4Doc);
        assert.ok(res3);
        assert.equal(res3.type, 'video');
    });

    test('returns null for protocol/text-only messages or empty metadata', () => {
        assert.equal(extractMediaPayload(null), null);
        assert.equal(extractMediaPayload(undefined), null);
        assert.equal(extractMediaPayload({ conversation: 'hello world' }), null);
        assert.equal(extractMediaPayload({ messageContextInfo: { messageSecret: 'xyz' } }), null);
    });
});

describe('clampBackfillLimit Validation', () => {
    test('defaults to 50 when undefined or invalid', () => {
        assert.equal(clampBackfillLimit(), 50);
        assert.equal(clampBackfillLimit(undefined), 50);
        assert.equal(clampBackfillLimit(NaN), 50);
    });

    test('clamps lower bound to 1', () => {
        assert.equal(clampBackfillLimit(0), 1);
        assert.equal(clampBackfillLimit(-15), 1);
    });

    test('clamps upper bound to 200', () => {
        assert.equal(clampBackfillLimit(250), 200);
        assert.equal(clampBackfillLimit(9999), 200);
    });

    test('preserves valid numbers in range [1, 200]', () => {
        assert.equal(clampBackfillLimit(10), 10);
        assert.equal(clampBackfillLimit(75), 75);
        assert.equal(clampBackfillLimit(200), 200);
    });
});

describe('ConversationController Media Endpoints Unit Tests', () => {
    test('retryMessageMedia returns 200 on success', async () => {
        const mockService: any = {
            retryMessageMedia: async (id: string) => ({
                success: true,
                mediaUrl: 'minio://whatsapp-data/photos/test.jpg'
            })
        };
        const controller = new ConversationController(mockService);

        let responseStatus = 200;
        let responseBody: any = null;

        const req: any = { params: { messageId: 'MSG123' } };
        const res: any = {
            status: (s: number) => { responseStatus = s; return res; },
            json: (b: any) => { responseBody = b; return res; }
        };

        await controller.retryMessageMedia(req, res);
        assert.equal(responseStatus, 200);
        assert.equal(responseBody.success, true);
        assert.equal(responseBody.mediaUrl, 'minio://whatsapp-data/photos/test.jpg');
    });

    test('retryMessageMedia returns 400 when service indicates failure', async () => {
        const mockService: any = {
            retryMessageMedia: async (id: string) => ({
                success: false,
                error: 'File expired on WhatsApp MMG'
            })
        };
        const controller = new ConversationController(mockService);

        let responseStatus = 200;
        let responseBody: any = null;

        const req: any = { params: { messageId: 'MSG123' } };
        const res: any = {
            status: (s: number) => { responseStatus = s; return res; },
            json: (b: any) => { responseBody = b; return res; }
        };

        await controller.retryMessageMedia(req, res);
        assert.equal(responseStatus, 400);
        assert.equal(responseBody.success, false);
        assert.equal(responseBody.error, 'File expired on WhatsApp MMG');
    });

    test('backfillChatMedia invokes backfill and returns summary', async () => {
        const mockService: any = {
            backfillChatMedia: async (jid: string, limit: number) => ({
                total: 5,
                downloaded: 4,
                failed: 1
            })
        };
        const controller = new ConversationController(mockService);

        let responseBody: any = null;
        const req: any = { params: { jid: '12345@g.us' }, body: { limit: 25 } };
        const res: any = {
            json: (b: any) => { responseBody = b; return res; }
        };

        await controller.backfillChatMedia(req, res);
        assert.equal(responseBody.total, 5);
        assert.equal(responseBody.downloaded, 4);
        assert.equal(responseBody.failed, 1);
    });
});

describe('getContentTypeFromFilename', () => {
    test('resolves video MIME types based on extension', () => {
        assert.equal(getContentTypeFromFilename('sample.mov'), 'video/quicktime');
        assert.equal(getContentTypeFromFilename('sample.MOV'), 'video/quicktime');
        assert.equal(getContentTypeFromFilename('clip.mp4'), 'video/mp4');
        assert.equal(getContentTypeFromFilename('clip.m4v'), 'video/x-m4v');
        assert.equal(getContentTypeFromFilename('clip.webm'), 'video/webm');
    });

    test('resolves image and audio MIME types based on extension', () => {
        assert.equal(getContentTypeFromFilename('pic.jpg'), 'image/jpeg');
        assert.equal(getContentTypeFromFilename('pic.jpeg'), 'image/jpeg');
        assert.equal(getContentTypeFromFilename('pic.png'), 'image/png');
        assert.equal(getContentTypeFromFilename('pic.webp'), 'image/webp');
        assert.equal(getContentTypeFromFilename('audio.mp3'), 'audio/mpeg');
        assert.equal(getContentTypeFromFilename('doc.pdf'), 'application/pdf');
    });

    test('falls back to mediaType when extension is unknown or missing', () => {
        assert.equal(getContentTypeFromFilename('file_without_ext', 'video'), 'video/mp4');
        assert.equal(getContentTypeFromFilename('file_without_ext', 'photo'), 'image/jpeg');
        assert.equal(getContentTypeFromFilename('file_without_ext', 'audio'), 'audio/mpeg');
        assert.equal(getContentTypeFromFilename('unknown.xyz', 'sticker'), 'image/webp');
        assert.equal(getContentTypeFromFilename('unknown.xyz'), 'application/octet-stream');
    });
});

