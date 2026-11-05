import { logger } from '../utils/logger';

export interface ReviewStageCounts {
    all: number;
    zoning: number;
    media_sync: number;
    qualification: number;
    catalog_ingestion: number;
    enrichment: number;
}

export interface ReviewInboxItem {
    groupId: string;
    jid: string;
    chatName: string | null;
    vendorName: string | null;
    status: string;
    reviewStage: string | null;
    errorDetail: string | null;
    mediaCount: number;
    textCount: number;
    description: string | null;
    lastMessageAt?: string | Date | null;
    updatedAt: string | Date;
    createdAt: string | Date;
    sampleMediaUrls: string[];
}

export interface ReviewInboxResult {
    success: boolean;
    stageCounts: ReviewStageCounts;
    items: ReviewInboxItem[];
    totalCount: number;
}

export const VALID_REVIEW_STAGES = ['zoning', 'media_sync', 'qualification', 'catalog_ingestion', 'enrichment'] as const;

/**
 * Fetches review inbox items with stage filtering, counts breakdown, and sample media URLs.
 */
export async function fetchReviewInboxData(
    client: any,
    stageParam?: string,
    limitParam?: any,
    offsetParam?: any
): Promise<ReviewInboxResult> {
    const rawStage = (stageParam || 'all').toLowerCase().trim();
    const stage = VALID_REVIEW_STAGES.includes(rawStage as any) ? rawStage : 'all';

    const limit = Math.min(200, Math.max(1, parseInt(limitParam, 10) || 50));
    const offset = Math.max(0, parseInt(offsetParam, 10) || 0);

    // 1. Stage Counts aggregation
    const stageCountsRes = await client.query(`
        SELECT 
            COUNT(*) as "all",
            COUNT(*) FILTER (WHERE review_stage = 'zoning') as "zoning",
            COUNT(*) FILTER (WHERE review_stage = 'media_sync') as "media_sync",
            COUNT(*) FILTER (WHERE review_stage = 'qualification') as "qualification",
            COUNT(*) FILTER (WHERE review_stage = 'catalog_ingestion') as "catalog_ingestion",
            COUNT(*) FILTER (WHERE review_stage = 'enrichment') as "enrichment"
        FROM wa.message_groups
        INNER JOIN wa.chats ON wa.message_groups.jid = wa.chats.jid
        WHERE wa.message_groups.status = 'needs_review'
          AND wa.chats.vendor_id IS NOT NULL
          AND wa.chats.enable_message_grouping = true
    `);

    const countsRow = stageCountsRes.rows[0] || {};
    const stageCounts: ReviewStageCounts = {
        all: parseInt(countsRow.all || '0', 10),
        zoning: parseInt(countsRow.zoning || '0', 10),
        media_sync: parseInt(countsRow.media_sync || '0', 10),
        qualification: parseInt(countsRow.qualification || '0', 10),
        catalog_ingestion: parseInt(countsRow.catalog_ingestion || '0', 10),
        enrichment: parseInt(countsRow.enrichment || '0', 10)
    };

    // 2. Fetch filtered items
    let stageFilterSql = '';
    const queryParams: any[] = [];
    if (stage !== 'all') {
        queryParams.push(stage);
        stageFilterSql = `AND mg.review_stage = $1`;
    }

    const limitParamIdx = queryParams.length + 1;
    const offsetParamIdx = queryParams.length + 2;
    queryParams.push(limit);
    queryParams.push(offset);

    const itemsRes = await client.query(
        `SELECT 
            mg.group_id as "groupId",
            mg.jid,
            c.name as "chatName",
            c.vendor_name as "vendorName",
            mg.status,
            mg.review_stage as "reviewStage",
            mg.error_detail as "errorDetail",
            mg.media_count as "mediaCount",
            mg.text_count as "textCount",
            mg.description,
            mg.last_message_at as "lastMessageAt",
            mg.updated_at as "updatedAt",
            mg.created_at as "createdAt"
         FROM wa.message_groups mg
         INNER JOIN wa.chats c ON mg.jid = c.jid
         WHERE mg.status = 'needs_review'
           AND c.vendor_id IS NOT NULL
           AND c.enable_message_grouping = true ${stageFilterSql}
         ORDER BY mg.last_message_at DESC NULLS LAST, mg.updated_at DESC
         LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
        queryParams
    );

    const items = itemsRes.rows;
    const groupIds = items.map((r: any) => r.groupId);

    // 3. Resolve sampleMediaUrls (up to 4 per group)
    const mediaByGroup: Record<string, string[]> = {};
    if (groupIds.length > 0) {
        try {
            const mediaRes = await client.query(
                `WITH RankedMedia AS (
                    SELECT 
                        group_id as "groupId",
                        media_url as "mediaUrl",
                        ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY timestamp ASC, id ASC) as rn
                    FROM wa.messages
                    WHERE group_id = ANY($1)
                      AND media_url IS NOT NULL 
                      AND media_url != '' 
                      AND media_url != 'minio://'
                      AND is_deleted = false
                )
                SELECT "groupId", "mediaUrl"
                FROM RankedMedia
                WHERE rn <= 4`,
                [groupIds]
            );

            let getPresignedUrlFn: ((url: string) => Promise<string>) | null = null;
            try {
                const mediaClient = await import('../clients/media.client');
                getPresignedUrlFn = mediaClient.getPresignedUrl;
            } catch {
                // Ignore if media client cannot be imported (e.g. unit tests)
            }

            for (const row of mediaRes.rows) {
                if (!mediaByGroup[row.groupId]) {
                    mediaByGroup[row.groupId] = [];
                }
                let resolvedUrl = row.mediaUrl;
                if (getPresignedUrlFn && resolvedUrl && (resolvedUrl.startsWith('minio://') || resolvedUrl.includes('/'))) {
                    try {
                        resolvedUrl = await getPresignedUrlFn(row.mediaUrl);
                    } catch {
                        // Presign fallback
                    }
                }
                mediaByGroup[row.groupId].push(resolvedUrl);
            }
        } catch (err: any) {
            logger.warn({ err: err.message }, 'Failed to resolve sample media URLs for review inbox');
        }
    }

    const populatedItems: ReviewInboxItem[] = items.map((item: any) => ({
        groupId: item.groupId,
        jid: item.jid,
        chatName: item.chatName || null,
        vendorName: item.vendorName || null,
        status: item.status,
        reviewStage: item.reviewStage || null,
        errorDetail: item.errorDetail || null,
        mediaCount: parseInt(item.mediaCount || '0', 10),
        textCount: parseInt(item.textCount || '0', 10),
        description: item.description || null,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
        sampleMediaUrls: mediaByGroup[item.groupId] || []
    }));

    const totalCount = stage in stageCounts ? stageCounts[stage as keyof ReviewStageCounts] : stageCounts.all;

    return {
        success: true,
        stageCounts,
        items: populatedItems,
        totalCount
    };
}

/**
 * Dismisses a group review: marks group as archived, writes audit log, emits websocket event.
 */
export async function dismissGroupReview(
    client: any,
    groupId: string,
    io?: any
): Promise<{ success: boolean; message: string; group?: any }> {
    const currentRes = await client.query(
        `SELECT status, review_stage, jid, media_count, text_count FROM wa.message_groups WHERE group_id = $1`,
        [groupId]
    );

    if (currentRes.rows.length === 0) {
        throw new Error('Group not found');
    }

    const oldStatus = currentRes.rows[0].status;
    const reviewStage = currentRes.rows[0].review_stage;

    await client.query(
        `UPDATE wa.message_groups 
         SET status = 'archived', updated_at = NOW() 
         WHERE group_id = $1`,
        [groupId]
    );

    // Write audit log
    try {
        await client.query(
            `INSERT INTO wa.group_audit_log (group_id, event, actor, old_value, new_value, occurred_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
                groupId,
                'dismissed_review',
                'operator',
                JSON.stringify({ status: oldStatus, reviewStage }),
                JSON.stringify({ status: 'archived', reviewStage })
            ]
        );
    } catch (err: any) {
        logger.error({ err: err.message, groupId }, 'Failed to write group audit log for dismiss');
    }

    if (io) {
        io.emit('group_updated', {
            groupId,
            status: 'archived',
            reviewStage,
            jid: currentRes.rows[0].jid
        });
    }

    return {
        success: true,
        message: `Group ${groupId} review dismissed and marked as archived.`,
        group: {
            groupId,
            status: 'archived',
            reviewStage,
            jid: currentRes.rows[0].jid
        }
    };
}
