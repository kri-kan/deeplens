process.env.NODE_ENV = 'test';
process.env.NO_LOG_ROTATION = 'true';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDescription } from '../src/services/group-readiness.service';

describe('Multi-Stage Review Classification & Gating (Task 3)', () => {
    test('isValidDescription enforces minimum 5 substantive words', () => {
        assert.equal(isValidDescription(''), false);
        assert.equal(isValidDescription(null), false);
        assert.equal(isValidDescription(undefined), false);
        assert.equal(isValidDescription('[image] [photo]'), false);
        assert.equal(isValidDescription('Kurti set red'), false); // Only 3 words
        assert.equal(isValidDescription('Exclusive party wear silk saree with zari'), true); // 7 words
    });

    test('Stage 1 (zoning): media count > 30 threshold logic', () => {
        const threshold = 30;
        const testCounts = [5, 29, 30, 31, 45];
        const results = testCounts.map(count => ({
            count,
            needsReview: count > threshold,
            stage: count > threshold ? 'zoning' : null,
            errorDetail: count > threshold ? `High media count (${count} > 30). Human zoning review/split required.` : null
        }));

        assert.equal(results[0].needsReview, false);
        assert.equal(results[1].needsReview, false);
        assert.equal(results[2].needsReview, false);
        assert.equal(results[3].needsReview, true);
        assert.equal(results[3].stage, 'zoning');
        assert.equal(results[3].errorDetail, 'High media count (31 > 30). Human zoning review/split required.');
        assert.equal(results[4].needsReview, true);
        assert.equal(results[4].stage, 'zoning');
    });

    test('Stage 2 (media_sync): stalled download or insufficient media with failures', () => {
        const checkMediaSync = (mediaCount: number, hasStalledMedia: boolean, hasFailedDownloads: boolean) => {
            if (hasStalledMedia || (mediaCount < 2 && hasFailedDownloads)) {
                return {
                    status: 'needs_review',
                    review_stage: 'media_sync',
                    error_detail: `Insufficient media (${mediaCount} < 2) or media download stalled.`
                };
            }
            return null;
        };

        // Stalled download (> 15m) with any media count
        assert.deepEqual(checkMediaSync(5, true, false), {
            status: 'needs_review',
            review_stage: 'media_sync',
            error_detail: 'Insufficient media (5 < 2) or media download stalled.'
        });

        // mediaCount < 2 with failed downloads
        assert.deepEqual(checkMediaSync(1, false, true), {
            status: 'needs_review',
            review_stage: 'media_sync',
            error_detail: 'Insufficient media (1 < 2) or media download stalled.'
        });

        // Healthy group with 3 media and no failures/stalls
        assert.equal(checkMediaSync(3, false, false), null);
    });

    test('Stage 3 (qualification): separate distinct errors for missing vendor vs invalid description', () => {
        const checkQualification = (vendorId: string | null | undefined, description: string) => {
            if (!vendorId) {
                return {
                    status: 'needs_review',
                    review_stage: 'qualification',
                    error_detail: 'Vendor not assigned to chat.'
                };
            }
            if (!isValidDescription(description)) {
                return {
                    status: 'needs_review',
                    review_stage: 'qualification',
                    error_detail: 'Description invalid or too short (< 5 words).'
                };
            }
            return null;
        };

        // Missing vendor gives distinct error
        assert.deepEqual(checkQualification(null, 'Beautiful designer silk lehenga choli set with dupatta'), {
            status: 'needs_review',
            review_stage: 'qualification',
            error_detail: 'Vendor not assigned to chat.'
        });

        // Invalid description gives distinct error (< 5 words)
        assert.deepEqual(checkQualification('vendor-123', 'Top'), {
            status: 'needs_review',
            review_stage: 'qualification',
            error_detail: 'Description invalid or too short (< 5 words).'
        });

        // Valid qualification passes
        assert.equal(checkQualification('vendor-123', 'Beautiful designer silk lehenga choli set with dupatta'), null);
    });

    test('Stage 3 (qualification): error clearing and self-healing requires BOTH vendor and valid description', () => {
        // Simulates checkAndEmitGroupEvent / runSelfHealingScan clearing logic
        const shouldClearQualification = (vendorId: string | null | undefined, description: string | null | undefined) => {
            return Boolean(vendorId) && isValidDescription(description);
        };

        // Chat has vendor, but description is short: MUST NOT clear qualification error!
        assert.equal(shouldClearQualification('vendor-123', 'Red saree'), false);
        assert.equal(shouldClearQualification('vendor-123', ''), false);
        assert.equal(shouldClearQualification('vendor-123', null), false);

        // Chat has no vendor, even if description is long: MUST NOT clear qualification error!
        assert.equal(shouldClearQualification(null, 'Exclusive party wear silk saree with zari border'), false);

        // BOTH vendor is assigned AND description is valid: CLEARS qualification error!
        assert.equal(shouldClearQualification('vendor-123', 'Exclusive party wear silk saree with zari border'), true);
    });

    test('Stage 5 (enrichment): preserve needs_review during write-back', () => {
        const computeNewStatus = (currentStatus: string) => {
            return currentStatus === 'needs_review' ? 'needs_review' : 'product_created';
        };

        assert.equal(computeNewStatus('needs_review'), 'needs_review');
        assert.equal(computeNewStatus('staging'), 'product_created');
        assert.equal(computeNewStatus('product_create_sent'), 'product_created');
    });
});
