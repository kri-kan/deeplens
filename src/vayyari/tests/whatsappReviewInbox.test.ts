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

  test('Deep linking path construction correctly embeds focusGroupId', () => {
    const item = mockInboxResponse.items[0];
    const deepLinkPath = `/utilities/whatsapp/zones/${encodeURIComponent(item.jid)}?focusGroupId=${encodeURIComponent(item.groupId)}`;
    assert.strictEqual(
      deepLinkPath,
      '/utilities/whatsapp/zones/123456789%40s.whatsapp.net?focusGroupId=grp-zoning-001'
    );
  });
});
