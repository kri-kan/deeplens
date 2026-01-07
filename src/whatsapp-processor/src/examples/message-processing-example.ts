/**
 * Example: How to integrate message processing queue
 * 
 * This file shows how to use the message queue system to process messages
 * only after they are fully available (including media downloads)
 */

import { messageQueue, ProcessableMessage } from '../services/message-queue.service';
import { logger } from '../utils/logger';

/**
 * Setup your custom message processing logic
 */
export function initializeMessageProcessing() {
    logger.info('Initializing message processing handlers');

    // Listen for messages that are ready to process
    messageQueue.on('message:ready', async (message: ProcessableMessage) => {
        try {
            await processCompleteMessage(message);
        } catch (err: any) {
            logger.error({ err, messageId: message.message_id }, 'Message processing failed');
            throw err; // Will be caught by queue and marked as failed
        }
    });

    logger.info('Message processing handlers initialized');
}

/**
 * Your custom processing logic - called only when message is complete
 */
async function processCompleteMessage(message: ProcessableMessage): Promise<void> {
    logger.info({
        messageId: message.message_id,
        jid: message.jid,
        hasMedia: !!message.media_url,
        mediaType: message.media_type
    }, 'Processing complete message');

    // 1. TEXT PROCESSING
    if (message.message_text) {
        await processText(message);
    }

    // 2. MEDIA PROCESSING (only if media is available)
    if (message.media_url && message.media_type) {
        await processMedia(message);
    }

    // 3. COMBINED PROCESSING
    await processMessageContext(message);

    logger.info({ messageId: message.message_id }, 'Message processing completed');
}

/**
 * Process message text
 */
async function processText(message: ProcessableMessage): Promise<void> {
    const text = message.message_text!;

    // Example: Extract entities, keywords, sentiment, etc.
    logger.debug({ messageId: message.message_id }, 'Processing text');

    // Your text processing logic here:
    // - Named Entity Recognition (NER)
    // - Sentiment Analysis
    // - Keyword Extraction
    // - Language Detection
    // - Intent Classification
    // - Generate embeddings for semantic search

    // Example:
    // const entities = await extractEntities(text);
    // const sentiment = await analyzeSentiment(text);
    // const keywords = await extractKeywords(text);
    // await saveAnalysis(message.message_id, { entities, sentiment, keywords });
}

/**
 * Process media (images, videos, audio, documents, stickers)
 */
async function processMedia(message: ProcessableMessage): Promise<void> {
    const { media_url, media_type, message_id } = message;

    logger.debug({ messageId: message_id, mediaType: media_type }, 'Processing media');

    switch (media_type) {
        case 'photo':
            await processImage(message_id, media_url!);
            break;

        case 'video':
            await processVideo(message_id, media_url!);
            break;

        case 'audio':
            await processAudio(message_id, media_url!);
            break;

        case 'document':
            await processDocument(message_id, media_url!);
            break;

        case 'sticker':
            await processSticker(message_id, media_url!);
            break;
    }
}

/**
 * Process image
 */
async function processImage(messageId: string, mediaUrl: string): Promise<void> {
    // Your image processing logic:
    // - Object detection
    // - OCR (text extraction from images)
    // - Face detection
    // - Image classification
    // - Generate image embeddings
    // - Thumbnail generation

    logger.debug({ messageId, mediaUrl }, 'Processing image');

    // Example:
    // const imageBuffer = await downloadFromMinIO(mediaUrl);
    // const objects = await detectObjects(imageBuffer);
    // const text = await performOCR(imageBuffer);
    // await saveImageAnalysis(messageId, { objects, text });
}

/**
 * Process video
 */
async function processVideo(messageId: string, mediaUrl: string): Promise<void> {
    // Your video processing logic:
    // - Extract keyframes
    // - Generate thumbnails
    // - Video classification
    // - Scene detection
    // - Speech-to-text (if audio track)

    logger.debug({ messageId, mediaUrl }, 'Processing video');
}

/**
 * Process audio
 */
async function processAudio(messageId: string, mediaUrl: string): Promise<void> {
    // Your audio processing logic:
    // - Speech-to-text transcription
    // - Speaker identification
    // - Audio classification
    // - Sentiment analysis from voice

    logger.debug({ messageId, mediaUrl }, 'Processing audio');
}

/**
 * Process document
 */
async function processDocument(messageId: string, mediaUrl: string): Promise<void> {
    // Your document processing logic:
    // - PDF text extraction
    // - Document classification
    // - Key information extraction
    // - Generate document embeddings

    logger.debug({ messageId, mediaUrl }, 'Processing document');
}

/**
 * Process sticker
 */
async function processSticker(messageId: string, mediaUrl: string): Promise<void> {
    // Your sticker processing logic:
    // - Sticker classification
    // - Emotion detection
    // - Similar sticker matching

    logger.debug({ messageId, mediaUrl }, 'Processing sticker');
}

/**
 * Process message in context (combine text + media + metadata)
 */
async function processMessageContext(message: ProcessableMessage): Promise<void> {
    // Your contextual processing:
    // - Combine text and media analysis
    // - Consider conversation history
    // - User profiling
    // - Topic modeling
    // - Relationship extraction

    logger.debug({ messageId: message.message_id }, 'Processing message context');

    // Example:
    // const conversationHistory = await getRecentMessages(message.jid, 10);
    // const context = await analyzeContext(message, conversationHistory);
    // await saveContext(message.message_id, context);
}

/**
 * Get processing statistics
 */
export async function getProcessingStats() {
    const stats = await messageQueue.getStats();
    logger.info(stats, 'Message processing statistics');
    return stats;
}

/**
 * Manually trigger processing for a specific message
 * Useful for reprocessing or debugging
 */
export async function reprocessMessage(messageId: string) {
    logger.info({ messageId }, 'Manually triggering message processing');
    await messageQueue.triggerProcessing(messageId);
}
