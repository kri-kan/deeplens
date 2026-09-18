import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Re-implement the pure logic helpers from messages/[jid].tsx to test edge cases
const isStickerMsg = (msg: any) => {
  return (
    msg.mediaType === 'sticker' ||
    (!!msg.mediaUrl && msg.mediaUrl.includes('/stickers/'))
  );
};

const isMediaArchived = (msg: any) => {
  if (isStickerMsg(msg) || msg.mediaType === 'document' || msg.mediaType === 'audio' || (!msg.mediaType && !msg.mediaUrl)) {
    return false;
  }
  return (
    !msg.mediaUrl ||
    msg.metadata?.isArchived === true ||
    msg.metadata?.deleted === true ||
    msg.metadata?.isTombstone === true ||
    msg.messageText === '[Media archived / deleted]' ||
    msg.messageText === '[Media Unavailable]'
  );
};

const hasActiveMedia = (msg: any) => {
  return !!msg.mediaUrl && !isMediaArchived(msg);
};

describe('WhatsApp Chat Media State Determination Rules', () => {
  test('stickers are NEVER marked as archived', () => {
    const sticker1 = { mediaType: 'sticker', mediaUrl: null };
    assert.equal(isMediaArchived(sticker1), false);

    const sticker2 = { mediaType: 'sticker', mediaUrl: 'minio://whatsapp-data/stickers/abc.webp' };
    assert.equal(isMediaArchived(sticker2), false);
    assert.equal(hasActiveMedia(sticker2), true);
  });

  test('documents, audios, and text-only messages are never considered media-archived', () => {
    const textMsg = { mediaType: null, mediaUrl: null, messageText: 'Hello world' };
    assert.equal(isMediaArchived(textMsg), false);

    const docMsg = { mediaType: 'document', mediaUrl: null, messageText: 'Invoice.pdf' };
    assert.equal(isMediaArchived(docMsg), false);

    const audioMsg = { mediaType: 'audio', mediaUrl: null, messageText: '' };
    assert.equal(isMediaArchived(audioMsg), false);
  });

  test('photos and videos with null mediaUrl are correctly marked as archived/missing', () => {
    const photoMsg = { messageId: 'P1', mediaType: 'photo', mediaUrl: null, metadata: { imageMessage: {} } };
    assert.equal(isMediaArchived(photoMsg), true);
    assert.equal(hasActiveMedia(photoMsg), false);

    const videoMsg = { messageId: 'V1', mediaType: 'video', mediaUrl: null, metadata: { videoMessage: {} } };
    assert.equal(isMediaArchived(videoMsg), true);
    assert.equal(hasActiveMedia(videoMsg), false);
  });

  test('successful retry updates mediaUrl and immediately transitions message from archived to active', () => {
    const unretriedPhoto: any = {
      messageId: 'P100',
      mediaType: 'photo',
      mediaUrl: null,
      metadata: { imageMessage: { url: 'https://mmg...' } }
    };

    assert.equal(isMediaArchived(unretriedPhoto), true);
    assert.equal(hasActiveMedia(unretriedPhoto), false);

    // Simulate optimistic update from setMessages on successful retry
    const retriedPhoto = {
      ...unretriedPhoto,
      mediaUrl: 'minio://whatsapp-data/photos/chat/100.jpg'
    };

    assert.equal(isMediaArchived(retriedPhoto), false);
    assert.equal(hasActiveMedia(retriedPhoto), true);
  });

  test('messages with explicit tombstone or deletion markers remain archived even if old URL exists', () => {
    const tombstoneMsg = {
      messageId: 'T1',
      mediaType: 'photo',
      mediaUrl: 'minio://whatsapp-data/photos/chat/tombstone.jpg',
      metadata: { isTombstone: true }
    };
    assert.equal(isMediaArchived(tombstoneMsg), true);
    assert.equal(hasActiveMedia(tombstoneMsg), false);

    const deletedTextMsg = {
      messageId: 'D1',
      mediaType: 'photo',
      mediaUrl: 'minio://whatsapp-data/photos/chat/del.jpg',
      messageText: '[Media archived / deleted]'
    };
    assert.equal(isMediaArchived(deletedTextMsg), true);
    assert.equal(hasActiveMedia(deletedTextMsg), false);
  });
});

describe('Media Retry & Backfill Endpoint URL Construction', () => {
  test('correctly constructs encoded URL paths for single message retry', () => {
    const messageId = '3A41+506C/2E61==';
    const expectedPath = `/conversations/messages/${encodeURIComponent(messageId)}/retry-media`;
    assert.equal(expectedPath, '/conversations/messages/3A41%2B506C%2F2E61%3D%3D/retry-media');
  });

  test('correctly constructs encoded URL paths for chat backfill', () => {
    const jid = '120363345527865021@g.us';
    const expectedPath = `/conversations/${encodeURIComponent(jid)}/backfill-media`;
    assert.equal(expectedPath, '/conversations/120363345527865021%40g.us/backfill-media');
  });
});
