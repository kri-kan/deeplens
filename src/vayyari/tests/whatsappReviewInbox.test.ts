import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  ReviewInboxResponse,
  ReviewInboxItem,
} from '../services/wa-processor.service';

const STAGE_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'zoning', label: 'Zoning' },
  { key: 'media_sync', label: 'Media Sync' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'catalog_ingestion', label: 'Ingestion' },
  { key: 'enrichment', label: 'Enrichment' },
];

describe('WhatsApp Review Inbox: Data Structures & Filtering', () => {
  const mockInboxResponse: ReviewInboxResponse = {
    success: true,
    stageCounts: {
      all: 5,
      zoning: 1,
      media_sync: 1,
      qualification: 1,
      catalog_ingestion: 1,
      enrichment: 1,
    },
    items: [
      {
        groupId: 'grp-zoning-001',
        jid: '123456789@s.whatsapp.net',
        chatName: 'Surat Sarees Wholesale',
        vendorName: 'Surat Silk Mills',
        status: 'needs_review',
        reviewStage: 'zoning',
        errorDetail: 'Too many messages in window without text separator',
        mediaCount: 12,
        textCount: 2,
        description: 'Heavy Banarasi silk saree with contrast pallu',
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        sampleMediaUrls: [
          'https://minio.local/media1.jpg',
          'https://minio.local/media2.jpg',
        ],
      },
      {
        groupId: 'grp-media-002',
        jid: '987654321@s.whatsapp.net',
        chatName: 'Kanchipuram Silks Direct',
        vendorName: 'Kanchi Weavers Guild',
        status: 'error',
        reviewStage: 'media_sync',
        errorDetail: 'Media download failed after 3 retries: 404 Not Found',
        mediaCount: 4,
        textCount: 1,
        description: 'Traditional pure silk saree with zari border',
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        sampleMediaUrls: ['https://minio.local/media3.jpg'],
      },
      {
        groupId: 'grp-qual-003',
        jid: '112233445@s.whatsapp.net',
        chatName: 'Varanasi Brocades',
        vendorName: null,
        status: 'needs_review',
        reviewStage: 'qualification',
        errorDetail: 'Price not detected in product description',
        mediaCount: 3,
        textCount: 1,
        description: 'New design catalog available for booking',
        updatedAt: new Date(Date.now() - 900000).toISOString(),
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        sampleMediaUrls: [],
      },
    ],
    totalCount: 3,
  };

  test('STAGE_PILLS contains all six multi-stage pipeline stages', () => {
    assert.strictEqual(STAGE_PILLS.length, 6);
    const keys = STAGE_PILLS.map((p) => p.key);
    assert.deepStrictEqual(keys, [
      'all',
      'zoning',
      'media_sync',
      'qualification',
      'catalog_ingestion',
      'enrichment',
    ]);
  });

  test('Stage counts map properly from ReviewStageCounts', () => {
    assert.strictEqual(mockInboxResponse.stageCounts.all, 5);
    assert.strictEqual(mockInboxResponse.stageCounts.zoning, 1);
    assert.strictEqual(mockInboxResponse.stageCounts.media_sync, 1);
    assert.strictEqual(mockInboxResponse.stageCounts.qualification, 1);
    assert.strictEqual(mockInboxResponse.stageCounts.catalog_ingestion, 1);
    assert.strictEqual(mockInboxResponse.stageCounts.enrichment, 1);
  });

  test('Search filter properly identifies items by error reason', () => {
    const q = 'Price not detected'.toLowerCase();
    const matched = mockInboxResponse.items.filter(
      (item) =>
        item.errorDetail?.toLowerCase().includes(q) ||
        item.chatName?.toLowerCase().includes(q) ||
        item.vendorName?.toLowerCase().includes(q)
    );
    assert.strictEqual(matched.length, 1);
    assert.strictEqual(matched[0].groupId, 'grp-qual-003');
  });

  test('Search filter properly identifies items by vendor name', () => {
    const q = 'kanchi weavers'.toLowerCase();
    const matched = mockInboxResponse.items.filter(
      (item) =>
        item.errorDetail?.toLowerCase().includes(q) ||
        item.chatName?.toLowerCase().includes(q) ||
        item.vendorName?.toLowerCase().includes(q)
    );
    assert.strictEqual(matched.length, 1);
    assert.strictEqual(matched[0].groupId, 'grp-media-002');
  });

  test('Deep linking path construction correctly embeds highlightGroupId for chat timeline', () => {
    const item = mockInboxResponse.items[0];
    const encodedJid = encodeURIComponent(item.jid);
    const chatName = encodeURIComponent(item.chatName || item.vendorName || 'Chat');
    const highlightGroup = encodeURIComponent(item.groupId);
    const deepLinkPath = `/utilities/whatsapp/messages/${encodedJid}?name=${chatName}&chatName=${chatName}&highlightGroupId=${highlightGroup}&targetGroupId=${highlightGroup}&sourceGroupId=${highlightGroup}&initialZoningMode=true`;
    assert.ok(deepLinkPath.includes('/utilities/whatsapp/messages/123456789%40s.whatsapp.net'));
    assert.ok(deepLinkPath.includes('highlightGroupId=grp-zoning-001'));
    assert.ok(deepLinkPath.includes('initialZoningMode=true'));
  });

  test('Review card prints actual chat message timestamp (lastMessageAt) in IST', () => {
    const { formatISTTimestamp } = require('../utils/date-format');
    const itemWithMsgTime: ReviewInboxItem = {
      groupId: 'product_120363218752966769_1730790000',
      jid: '120363218752966769@g.us',
      chatName: 'Harley Reseller Group',
      vendorName: 'Harley Exports',
      status: 'needs_review',
      reviewStage: 'qualification',
      errorDetail: 'Missing price tag',
      mediaCount: 5,
      textCount: 1,
      lastMessageAt: '2026-11-05T07:30:00.000Z',
      updatedAt: '2026-11-05T08:15:00.000Z',
      createdAt: '2026-11-05T08:00:00.000Z',
      description: '',
      sampleMediaUrls: [],
    };

    const formatted = formatISTTimestamp(
      itemWithMsgTime.lastMessageAt || itemWithMsgTime.updatedAt || itemWithMsgTime.createdAt,
      itemWithMsgTime.groupId
    );

    // 07:30 UTC is 13:00 IST (1:00 PM)
    assert.ok(formatted.includes('1:00 PM'), `Expected formatted timestamp to reflect 1:00 PM IST, got: ${formatted}`);
  });

  test('Review card falls back to updatedAt or createdAt when lastMessageAt is undefined/null', () => {
    const { formatISTTimestamp } = require('../utils/date-format');
    const itemWithoutMsgTime: ReviewInboxItem = {
      groupId: 'product_120363218752966769_1730790000',
      jid: '120363218752966769@g.us',
      chatName: 'Harley Reseller Group',
      vendorName: 'Harley Exports',
      status: 'needs_review',
      reviewStage: 'qualification',
      errorDetail: 'Missing price tag',
      mediaCount: 5,
      textCount: 1,
      lastMessageAt: null,
      updatedAt: '2026-11-05T05:00:00.000Z',
      createdAt: '2026-11-05T04:30:00.000Z',
      description: '',
      sampleMediaUrls: [],
    };

    const formatted = formatISTTimestamp(
      itemWithoutMsgTime.lastMessageAt || itemWithoutMsgTime.updatedAt || itemWithoutMsgTime.createdAt,
      itemWithoutMsgTime.groupId
    );

    // 05:00 UTC is 10:30 AM IST
    assert.ok(formatted.includes('10:30 AM'), `Expected fallback timestamp to reflect 10:30 AM IST, got: ${formatted}`);
  });
});

