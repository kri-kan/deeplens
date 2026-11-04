process.env.NODE_ENV = 'test';
process.env.NO_LOG_ROTATION = 'true';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    fetchReviewInboxData,
    dismissGroupReview,
    VALID_REVIEW_STAGES,
    ReviewStageCounts
} from '../src/services/review-inbox.service';

describe('Unified Review API with Stage Filtering (Task 4)', () => {
    describe('VALID_REVIEW_STAGES', () => {
        test('contains exactly the 5 pipeline gating stages', () => {
            assert.deepEqual([...VALID_REVIEW_STAGES], [
                'zoning',
                'media_sync',
                'qualification',
                'catalog_ingestion',
                'enrichment'
            ]);
        });
    });

    describe('fetchReviewInboxData', () => {
        test('stage = "all" queries stageCounts and returns all needs_review items', async () => {
            const executedQueries: { query: string; params?: any[] }[] = [];

            const mockClient = {
                query: async (query: string, params?: any[]) => {
                    executedQueries.push({ query, params });

                    // Stage counts query
                    if (query.includes('COUNT(*) FILTER (WHERE review_stage = \'zoning\')')) {
                        return {
                            rows: [{
                                all: '10',
                                zoning: '2',
                                media_sync: '3',
                                qualification: '4',
                                catalog_ingestion: '1',
                                enrichment: '0'
                            }]
                        };
                    }

                    // Items query
                    if (query.includes('FROM wa.message_groups mg')) {
                        return {
                            rows: [
                                {
                                    groupId: 'group_001',
                                    jid: '12345@s.whatsapp.net',
                                    chatName: 'Vendor Chat 1',
                                    vendorName: 'Surat Silks',
                                    status: 'needs_review',
                                    reviewStage: 'zoning',
                                    errorDetail: 'High media count (35 > 30). Human zoning review/split required.',
                                    mediaCount: 35,
                                    textCount: 3,
                                    description: 'Beautiful designer saree catalog set',
                                    updatedAt: '2026-11-04T12:00:00Z',
                                    createdAt: '2026-11-04T11:50:00Z'
                                },
                                {
                                    groupId: 'group_002',
                                    jid: '67890@s.whatsapp.net',
                                    chatName: 'Vendor Chat 2',
                                    vendorName: 'Banaras Weaves',
                                    status: 'needs_review',
                                    reviewStage: 'qualification',
                                    errorDetail: 'Vendor not assigned to chat.',
                                    mediaCount: 4,
                                    textCount: 1,
                                    description: 'Pure georgette suit with dupatta',
                                    updatedAt: '2026-11-04T12:05:00Z',
                                    createdAt: '2026-11-04T11:55:00Z'
                                }
                            ]
                        };
                    }

                    // Sample media query
                    if (query.includes('WITH RankedMedia AS')) {
                        return {
                            rows: [
                                { groupId: 'group_001', mediaUrl: 'minio://photos/saree_1.jpg' },
                                { groupId: 'group_001', mediaUrl: 'minio://photos/saree_2.jpg' },
                                { groupId: 'group_002', mediaUrl: 'minio://photos/suit_1.jpg' }
                            ]
                        };
                    }

                    return { rows: [] };
                }
            };

            const result = await fetchReviewInboxData(mockClient, 'all', 50, 0);

            assert.equal(result.success, true);
            assert.deepEqual(result.stageCounts, {
                all: 10,
                zoning: 2,
                media_sync: 3,
                qualification: 4,
                catalog_ingestion: 1,
                enrichment: 0
            });
            assert.equal(result.totalCount, 10);
            assert.equal(result.items.length, 2);

            // Item 1 verification
            assert.equal(result.items[0].groupId, 'group_001');
            assert.equal(result.items[0].reviewStage, 'zoning');
            assert.equal(result.items[0].mediaCount, 35);
            assert.deepEqual(result.items[0].sampleMediaUrls, [
                'minio://photos/saree_1.jpg',
                'minio://photos/saree_2.jpg'
            ]);

            // Item 2 verification
            assert.equal(result.items[1].groupId, 'group_002');
            assert.equal(result.items[1].reviewStage, 'qualification');
            assert.deepEqual(result.items[1].sampleMediaUrls, [
                'minio://photos/suit_1.jpg'
            ]);

            // Verify query does not filter review_stage when stage is 'all'
            const itemQuery = executedQueries.find(q => q.query.includes('FROM wa.message_groups mg'));
            assert.ok(itemQuery);
            assert.ok(!itemQuery.query.includes('AND mg.review_stage = $1'));
        });

        test('stage filtering: stage = "qualification" applies review_stage filter and sets totalCount', async () => {
            const executedQueries: { query: string; params?: any[] }[] = [];

            const mockClient = {
                query: async (query: string, params?: any[]) => {
                    executedQueries.push({ query, params });

                    if (query.includes('COUNT(*) FILTER')) {
                        return {
                            rows: [{
                                all: '12',
                                zoning: '3',
                                media_sync: '2',
                                qualification: '5',
                                catalog_ingestion: '2',
                                enrichment: '0'
                            }]
                        };
                    }

                    if (query.includes('FROM wa.message_groups mg')) {
                        return {
                            rows: [
                                {
                                    groupId: 'group_qual_1',
                                    jid: '123@s.whatsapp.net',
                                    chatName: 'Chat 1',
                                    vendorName: null,
                                    status: 'needs_review',
                                    reviewStage: 'qualification',
                                    errorDetail: 'Vendor not assigned to chat.',
                                    mediaCount: 3,
                                    textCount: 1,
                                    description: 'Test catalog item description',
                                    updatedAt: '2026-11-04T12:00:00Z',
                                    createdAt: '2026-11-04T11:00:00Z'
                                }
                            ]
                        };
                    }

                    return { rows: [] };
                }
            };

            const result = await fetchReviewInboxData(mockClient, 'qualification', 20, 0);

            assert.equal(result.success, true);
            assert.equal(result.totalCount, 5); // matches stageCounts.qualification
            assert.equal(result.items.length, 1);
            assert.equal(result.items[0].reviewStage, 'qualification');

            const itemQuery = executedQueries.find(q => q.query.includes('FROM wa.message_groups mg'));
            assert.ok(itemQuery);
            assert.ok(itemQuery.query.includes('AND mg.review_stage = $1'));
            assert.equal(itemQuery.params?.[0], 'qualification');
            assert.equal(itemQuery.params?.[1], 20); // limit
            assert.equal(itemQuery.params?.[2], 0);  // offset
        });

        test('stage filtering: invalid stage defaults to "all"', async () => {
            const executedQueries: { query: string; params?: any[] }[] = [];

            const mockClient = {
                query: async (query: string, params?: any[]) => {
                    executedQueries.push({ query, params });
                    if (query.includes('COUNT(*) FILTER')) {
                        return {
                            rows: [{
                                all: '5',
                                zoning: '1',
                                media_sync: '1',
                                qualification: '1',
                                catalog_ingestion: '1',
                                enrichment: '1'
                            }]
                        };
                    }
                    return { rows: [] };
                }
            };

            const result = await fetchReviewInboxData(mockClient, 'non_existent_stage', 10, 5);

            assert.equal(result.success, true);
            assert.equal(result.totalCount, 5); // defaults to all

            const itemQuery = executedQueries.find(q => q.query.includes('FROM wa.message_groups mg'));
            assert.ok(itemQuery);
            assert.ok(!itemQuery.query.includes('AND mg.review_stage = $1'));
            assert.equal(itemQuery.params?.[0], 10); // limit
            assert.equal(itemQuery.params?.[1], 5);  // offset
        });

        test('pagination limits: clamps limit between 1 and 200, offset >= 0', async () => {
            const executedQueries: { query: string; params?: any[] }[] = [];

            const mockClient = {
                query: async (query: string, params?: any[]) => {
                    executedQueries.push({ query, params });
                    if (query.includes('COUNT(*) FILTER')) {
                        return { rows: [{ all: '0', zoning: '0', media_sync: '0', qualification: '0', catalog_ingestion: '0', enrichment: '0' }] };
                    }
                    return { rows: [] };
                }
            };

            // Test clamping high limit and negative offset
            await fetchReviewInboxData(mockClient, 'all', 9999, -50);
            const query1 = executedQueries.find(q => q.query.includes('FROM wa.message_groups mg'));
            assert.equal(query1?.params?.[0], 200); // clamped to 200
            assert.equal(query1?.params?.[1], 0);   // clamped to 0

            executedQueries.length = 0;

            // Test clamping low limit
            await fetchReviewInboxData(mockClient, 'all', 0, 10);
            const query2 = executedQueries.find(q => q.query.includes('FROM wa.message_groups mg'));
            assert.equal(query2?.params?.[0], 50); // 0 is falsy, defaults to 50
        });
    });

    describe('dismissGroupReview', () => {
        test('marks group as archived, logs dismissed_review audit, and emits socket event', async () => {
            const executedQueries: { query: string; params?: any[] }[] = [];
            const emittedEvents: { event: string; payload: any }[] = [];

            const mockClient = {
                query: async (query: string, params?: any[]) => {
                    executedQueries.push({ query, params });

                    if (query.includes('SELECT status, review_stage, jid')) {
                        return {
                            rows: [{
                                status: 'needs_review',
                                review_stage: 'zoning',
                                jid: 'test_chat@s.whatsapp.net',
                                media_count: 32,
                                text_count: 2
                            }]
                        };
                    }

                    if (query.includes('UPDATE wa.message_groups')) {
                        return { rowCount: 1 };
                    }

                    if (query.includes('INSERT INTO wa.group_audit_log')) {
                        return { rowCount: 1 };
                    }

                    return { rows: [] };
                }
            };

            const mockIo = {
                emit: (event: string, payload: any) => {
                    emittedEvents.push({ event, payload });
                }
            };

            const result = await dismissGroupReview(mockClient, 'group_to_dismiss', mockIo);

            assert.equal(result.success, true);
            assert.equal(result.group.status, 'archived');
            assert.equal(result.group.reviewStage, 'zoning');

            // Verify status was updated to 'archived'
            const updateQuery = executedQueries.find(q => q.query.includes('UPDATE wa.message_groups'));
            assert.ok(updateQuery);
            assert.ok(updateQuery.query.includes("SET status = 'archived'"));
            assert.equal(updateQuery.params?.[0], 'group_to_dismiss');

            // Verify audit log
            const auditQuery = executedQueries.find(q => q.query.includes('INSERT INTO wa.group_audit_log'));
            assert.ok(auditQuery);
            assert.equal(auditQuery.params?.[0], 'group_to_dismiss');
            assert.equal(auditQuery.params?.[1], 'dismissed_review');
            assert.equal(auditQuery.params?.[2], 'operator');

            // Verify socket event
            assert.equal(emittedEvents.length, 1);
            assert.equal(emittedEvents[0].event, 'group_updated');
            assert.deepEqual(emittedEvents[0].payload, {
                groupId: 'group_to_dismiss',
                status: 'archived',
                reviewStage: 'zoning',
                jid: 'test_chat@s.whatsapp.net'
            });
        });

        test('throws error if group is not found', async () => {
            const mockClient = {
                query: async () => ({ rows: [] })
            };

            await assert.rejects(
                async () => {
                    await dismissGroupReview(mockClient, 'non_existent_group');
                },
                /Group not found/
            );
        });
    });

    describe('Route registration verification', () => {
        test('createGroupReviewRoutes registers review-inbox before :jid', async () => {
            const { createGroupReviewRoutes } = await import('../src/routes/group-review.routes');
            const router = createGroupReviewRoutes();

            const routes = router.stack
                .filter(layer => layer.route)
                .map(layer => ({
                    path: layer.route.path,
                    methods: Object.keys(layer.route.methods)
                }));

            const inboxIdx = routes.findIndex(r => r.path === '/group-review/review-inbox');
            const jidIdx = routes.findIndex(r => r.path === '/group-review/:jid');
            const dismissIdx = routes.findIndex(r => r.path === '/group-review/:groupId/dismiss');
            const ignoreIdx = routes.findIndex(r => r.path === '/group-review/:groupId/ignore');

            assert.ok(inboxIdx !== -1, 'GET /group-review/review-inbox must be registered');
            assert.ok(jidIdx !== -1, 'GET /group-review/:jid must be registered');
            assert.ok(inboxIdx < jidIdx, 'review-inbox must be registered BEFORE :jid so it is not captured as param');
            assert.ok(dismissIdx !== -1, 'POST /group-review/:groupId/dismiss must be registered');
            assert.ok(ignoreIdx !== -1, 'POST /group-review/:groupId/ignore must be registered');
        });

        test('createPipelineFailuresRoutes registers review-inbox and pipeline-failures', async () => {
            const { createPipelineFailuresRoutes } = await import('../src/routes/pipeline-failures.routes');
            const router = createPipelineFailuresRoutes();

            const routes = router.stack
                .filter(layer => layer.route)
                .map(layer => ({
                    path: layer.route.path,
                    methods: Object.keys(layer.route.methods)
                }));

            assert.ok(routes.some(r => r.path === '/pipeline-failures'), '/pipeline-failures must be registered');
            assert.ok(routes.some(r => r.path === '/review-inbox'), '/review-inbox must be registered');
            assert.ok(routes.some(r => r.path === '/pipeline-events'), '/pipeline-events must be registered');
        });
    });
});

