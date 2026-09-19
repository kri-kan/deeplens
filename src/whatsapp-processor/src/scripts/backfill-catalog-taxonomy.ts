/**
 * Catalog Taxonomy Multi-Dimensional Metadata Backfill Worker
 * ADO Work Item: #682 (Parent: #680)
 *
 * High-throughput queued catalog backfill worker script that:
 * 1. Loads dynamic taxonomy registry from public.taxonomy_facets.
 * 2. Iterates over public.products in safe, transactional batches (e.g. 200).
 * 3. Inspects product description, vendor listing descriptions, and linked wa.message_groups.
 * 4. Extracts canonical facets: fabric_base, craft_technique, motif_pattern, border_pallu,
 *    blouse_format, stitch_type, occasions, dimensions.
 * 5. Safely enriches:
 *    - public.products.unified_attributes (merged jsonb)
 *    - public.products.fabric (if Unknown or null)
 *    - public.products.stitch_type (if Unknown or null)
 *    - public.products.tags (appends relevant dimension tags)
 *    - Increments usage_count in public.taxonomy_facets
 * 6. Logs detailed before/after statistics and ETA progress.
 */

process.env.NO_LOG_ROTATION = 'true';

import { Pool, PoolClient } from 'pg';
import { VAYYARI_WA_DB_CONNECTION_STRING } from '../config';
import { logger } from '../utils/logger';
import {
  TaxonomyRegistry,
  extractMultiDimensionalMetadata,
  formatUnifiedAttributesWithTaxonomy,
} from '../services/taxonomy-extraction.service';

export interface BackfillOptions {
  batchSize?: number;
  limit?: number;
  dryRun?: boolean;
  forceAll?: boolean;
  concurrency?: number;
}

export interface BackfillSummary {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  totalProductsInCatalog: number;
  productsTargeted: number;
  productsProcessed: number;
  productsUpdated: number;
  fabricsEnriched: number;
  stitchesEnriched: number;
  tagsAppendedTotal: number;
  facetUsageIncrements: number;
  errorsCount: number;
  throughputPerSecond: number;
  beforeStats: {
    total: number;
    fabricUnknown: number;
    stitchUnknown: number;
    withUnifiedAttrs: number;
  };
  afterStats: {
    total: number;
    fabricUnknown: number;
    stitchUnknown: number;
    withUnifiedAttrs: number;
  };
}

interface ProductBatchRow {
  id: string;
  title: string | null;
  fabric: string | null;
  stitch_type: string | null;
  tags: string[] | null;
  unified_attributes: Record<string, any> | null;
  product_description: string | null;
  vl_description: string;
  mg_description: string;
}

interface ProductUpdatePayload {
  id: string;
  new_fabric: string | null;
  new_stitch_type: string | null;
  new_tags: string[];
  new_unified_attributes: string; // JSON string
  facetIds: string[];
}

export async function runCatalogTaxonomyBackfill(options: BackfillOptions = {}): Promise<BackfillSummary> {
  const batchSize = Math.max(10, options.batchSize || 200);
  const dryRun = Boolean(options.dryRun);
  const limit = options.limit && options.limit > 0 ? options.limit : null;
  const forceAll = Boolean(options.forceAll);

  const connectionString = VAYYARI_WA_DB_CONNECTION_STRING || process.env.VAYYARI_WA_DB_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Database connection string (VAYYARI_WA_DB_CONNECTION_STRING) is not configured');
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const startTime = new Date();
  logger.info({ batchSize, dryRun, limit, forceAll }, 'Starting Catalog Multi-Dimensional Taxonomy Backfill...');

  let client: PoolClient | null = null;
  try {
    client = await pool.connect();

    // 1. Audit baseline catalog counts
    const baselineRes = await client.query<{
      total: string;
      fabric_unknown: string;
      stitch_unknown: string;
      with_unified_attrs: string;
    }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN fabric IS NULL OR fabric = 'Unknown' THEN 1 END) as fabric_unknown,
        COUNT(CASE WHEN stitch_type IS NULL OR stitch_type = 'Unknown' THEN 1 END) as stitch_unknown,
        COUNT(CASE WHEN unified_attributes IS NOT NULL AND unified_attributes != '{}'::jsonb THEN 1 END) as with_unified_attrs
      FROM public.products;
    `);

    const beforeStats = {
      total: parseInt(baselineRes.rows[0].total, 10),
      fabricUnknown: parseInt(baselineRes.rows[0].fabric_unknown, 10),
      stitchUnknown: parseInt(baselineRes.rows[0].stitch_unknown, 10),
      withUnifiedAttrs: parseInt(baselineRes.rows[0].with_unified_attrs, 10),
    };

    logger.info(
      beforeStats,
      'Catalog Baseline: %d total products (%d fabric Unknown, %d stitch Unknown)',
      beforeStats.total,
      beforeStats.fabricUnknown,
      beforeStats.stitchUnknown
    );

    // 2. Load dynamic taxonomy facets registry
    const registry = new TaxonomyRegistry();
    await registry.loadFromDb(client);
    logger.info({ facetsCount: registry.getAllFacets().length }, 'Loaded dynamic taxonomy facets registry');

    // 3. Count total products to target
    const targetCountRes = await client.query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM public.products
      WHERE 1=1
      ${forceAll ? '' : "AND (fabric = 'Unknown' OR fabric IS NULL OR stitch_type = 'Unknown' OR stitch_type IS NULL OR unified_attributes IS NULL OR NOT (unified_attributes ? 'taxonomy_version'))"};
    `);

    let targetTotal = parseInt(targetCountRes.rows[0].count, 10);
    if (limit && limit < targetTotal) {
      targetTotal = limit;
    }

    logger.info({ targetTotal }, 'Products queued for taxonomy enrichment: %d', targetTotal);

    let processedCount = 0;
    let updatedCount = 0;
    let fabricsEnriched = 0;
    let stitchesEnriched = 0;
    let totalTagsAdded = 0;
    let errorsCount = 0;
    const globalFacetFrequency: Map<string, number> = new Map();

    let lastId: string | null = null;
    let hasMore = true;
    let batchIndex = 0;

    // Release client back to pool for batch loop
    client.release();
    client = null;

    while (hasMore && processedCount < targetTotal) {
      batchIndex++;
      const currentBatchLimit = Math.min(batchSize, targetTotal - processedCount);

      const batchClient = await pool.connect();
      let fetchedBatchLength = 0;
      try {
        // Fetch batch with CTE & keyset pagination
        const queryParams: any[] = [currentBatchLimit];
        let idFilter = '';
        if (lastId) {
          queryParams.push(lastId);
          idFilter = `AND id > $${queryParams.length}`;
        }

        const fetchQuery = `
          WITH batch_products AS (
            SELECT id, title, fabric, stitch_type, tags, unified_attributes, description
            FROM public.products
            WHERE 1=1
            ${idFilter}
            ${forceAll ? '' : "AND (fabric = 'Unknown' OR fabric IS NULL OR stitch_type = 'Unknown' OR stitch_type IS NULL OR unified_attributes IS NULL OR NOT (unified_attributes ? 'taxonomy_version'))"}
            ORDER BY id ASC
            LIMIT $1
          )
          SELECT 
            bp.id,
            bp.title,
            bp.fabric,
            bp.stitch_type,
            bp.tags,
            bp.unified_attributes,
            bp.description as product_description,
            COALESCE(string_agg(DISTINCT vl.description, E'\n---\n') FILTER (WHERE vl.description IS NOT NULL AND length(trim(vl.description)) > 0), '') as vl_description,
            COALESCE(string_agg(DISTINCT COALESCE(mg_p.description, mg_vl.description), E'\n---\n') FILTER (WHERE length(trim(COALESCE(mg_p.description, mg_vl.description))) > 0), '') as mg_description
          FROM batch_products bp
          LEFT JOIN public.vendor_listings vl ON vl.product_id = bp.id
          LEFT JOIN wa.message_groups mg_p ON mg_p.deeplens_product_id = bp.id
          LEFT JOIN wa.message_groups mg_vl ON mg_vl.group_id = vl.source_group_id
          GROUP BY bp.id, bp.title, bp.fabric, bp.stitch_type, bp.tags, bp.unified_attributes, bp.description
          ORDER BY bp.id ASC;
        `;

        const batchRes = await batchClient.query<ProductBatchRow>(fetchQuery, queryParams);
        const rows = batchRes.rows;
        fetchedBatchLength = rows.length;

        if (rows.length === 0) {
          hasMore = false;
          batchClient.release();
          break;
        }

        lastId = rows[rows.length - 1].id;

        // Process batch in memory
        const updatePayloads: ProductUpdatePayload[] = [];
        const batchFacetIncrements: Map<string, number> = new Map();

        for (const row of rows) {
          const combinedText = [
            row.title,
            row.product_description,
            row.vl_description,
            row.mg_description,
          ]
            .filter(Boolean)
            .join('\n\n');

          const extracted = extractMultiDimensionalMetadata(
            combinedText,
            row.unified_attributes,
            registry
          );

          // Determine fabric update
          const isFabricUnknown = !row.fabric || row.fabric === 'Unknown';
          const newFabric = isFabricUnknown && extracted.fabric_base ? extracted.fabric_base : null;
          if (newFabric) fabricsEnriched++;

          // Determine stitch update
          const isStitchUnknown = !row.stitch_type || row.stitch_type === 'Unknown';
          const newStitch = isStitchUnknown && extracted.base_stitch_type ? extracted.base_stitch_type : null;
          if (newStitch) stitchesEnriched++;

          // Determine tags update
          const currentTags = (row.tags || []).map(t => t.toLowerCase().trim());
          const newTagsToAdd = extracted.tags.filter(t => !currentTags.includes(t));
          totalTagsAdded += newTagsToAdd.length;

          // Merge unified_attributes
          const updatedUa = formatUnifiedAttributesWithTaxonomy(row.unified_attributes, extracted);

          // Track facet matches
          for (const facetId of extracted.matchedFacetIds) {
            batchFacetIncrements.set(facetId, (batchFacetIncrements.get(facetId) || 0) + 1);
            globalFacetFrequency.set(facetId, (globalFacetFrequency.get(facetId) || 0) + 1);
          }

          updatePayloads.push({
            id: row.id,
            new_fabric: newFabric,
            new_stitch_type: newStitch,
            new_tags: newTagsToAdd,
            new_unified_attributes: JSON.stringify(updatedUa),
            facetIds: extracted.matchedFacetIds,
          });
        }

        // Apply transactional batch update
        if (!dryRun && updatePayloads.length > 0) {
          await batchClient.query('BEGIN');

          // Batch update products
          const updateValuesSql: string[] = [];
          const updateParams: any[] = [];

          updatePayloads.forEach((payload, idx) => {
            const baseParamIdx = idx * 5;
            updateValuesSql.push(
              `($${baseParamIdx + 1}::uuid, $${baseParamIdx + 2}::text, $${baseParamIdx + 3}::text, $${baseParamIdx + 4}::text[], $${baseParamIdx + 5}::jsonb)`
            );
            updateParams.push(
              payload.id,
              payload.new_fabric,
              payload.new_stitch_type,
              payload.new_tags,
              payload.new_unified_attributes
            );
          });

          const updateSql = `
            UPDATE public.products AS p
            SET
              fabric = CASE 
                WHEN v.new_fabric IS NOT NULL THEN v.new_fabric 
                ELSE p.fabric 
              END,
              stitch_type = CASE 
                WHEN v.new_stitch_type IS NOT NULL THEN v.new_stitch_type 
                ELSE p.stitch_type 
              END,
              tags = ARRAY(
                SELECT DISTINCT lower(trim(elem))
                FROM unnest(array_cat(COALESCE(p.tags, '{}'::text[]), v.new_tags::text[])) AS elem
                WHERE length(trim(elem)) > 0
              ),
              unified_attributes = v.new_unified_attributes::jsonb,
              updated_at = NOW()
            FROM (VALUES
              ${updateValuesSql.join(',\n              ')}
            ) AS v(id, new_fabric, new_stitch_type, new_tags, new_unified_attributes)
            WHERE p.id = v.id;
          `;

          await batchClient.query(updateSql, updateParams);

          // Batch increment taxonomy_facets usage_count
          if (batchFacetIncrements.size > 0) {
            const facetValuesSql: string[] = [];
            const facetParams: any[] = [];
            let fIdx = 0;

            batchFacetIncrements.forEach((incCount, facetId) => {
              facetValuesSql.push(`($${fIdx * 2 + 1}::uuid, $${fIdx * 2 + 2}::int)`);
              facetParams.push(facetId, incCount);
              fIdx++;
            });

            const facetUpdateSql = `
              UPDATE public.taxonomy_facets AS tf
              SET 
                usage_count = tf.usage_count + v.inc_count,
                updated_at = NOW()
              FROM (VALUES
                ${facetValuesSql.join(',\n                ')}
              ) AS v(id, inc_count)
              WHERE tf.id = v.id;
            `;

            await batchClient.query(facetUpdateSql, facetParams);
          }

          await batchClient.query('COMMIT');
        }

        processedCount += rows.length;
        updatedCount += updatePayloads.length;

        // Progress telemetry
        const elapsedSec = (new Date().getTime() - startTime.getTime()) / 1000;
        const currentRate = processedCount / (elapsedSec || 1);
        const remainingProducts = Math.max(0, targetTotal - processedCount);
        const etaSeconds = currentRate > 0 ? Math.round(remainingProducts / currentRate) : 0;
        const percent = Math.min(100, Math.round((processedCount / targetTotal) * 100));

        logger.info(
          {
            batch: batchIndex,
            processed: processedCount,
            targetTotal,
            percent: `${percent}%`,
            rate: `${Math.round(currentRate)}/sec`,
            eta: `${etaSeconds}s`,
            fabricsEnriched,
            stitchesEnriched,
          },
          `Progress: ${processedCount}/${targetTotal} (${percent}%) • Rate: ${Math.round(currentRate)}/s • ETA: ${etaSeconds}s`
        );
      } catch (batchErr) {
        errorsCount++;
        logger.error({ err: batchErr, batchIndex, lastId }, 'Error processing catalog backfill batch');
        try {
          await batchClient.query('ROLLBACK');
        } catch (_) {}
      } finally {
        batchClient.release();
      }

      if (fetchedBatchLength < batchSize) {
        hasMore = false;
      }
    }

    // 4. Audit final after-stats
    const auditClient = await pool.connect();
    const finalRes = await auditClient.query<{
      total: string;
      fabric_unknown: string;
      stitch_unknown: string;
      with_unified_attrs: string;
    }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN fabric IS NULL OR fabric = 'Unknown' THEN 1 END) as fabric_unknown,
        COUNT(CASE WHEN stitch_type IS NULL OR stitch_type = 'Unknown' THEN 1 END) as stitch_unknown,
        COUNT(CASE WHEN unified_attributes IS NOT NULL AND unified_attributes != '{}'::jsonb THEN 1 END) as with_unified_attrs
      FROM public.products;
    `);

    const afterStats = {
      total: parseInt(finalRes.rows[0].total, 10),
      fabricUnknown: parseInt(finalRes.rows[0].fabric_unknown, 10),
      stitchUnknown: parseInt(finalRes.rows[0].stitch_unknown, 10),
      withUnifiedAttrs: parseInt(finalRes.rows[0].with_unified_attrs, 10),
    };
    auditClient.release();

    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    const throughputPerSecond = Math.round(processedCount / (durationSeconds || 1));

    const summary: BackfillSummary = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds,
      totalProductsInCatalog: beforeStats.total,
      productsTargeted: targetTotal,
      productsProcessed: processedCount,
      productsUpdated: updatedCount,
      fabricsEnriched,
      stitchesEnriched,
      tagsAppendedTotal: totalTagsAdded,
      facetUsageIncrements: globalFacetFrequency.size,
      errorsCount,
      throughputPerSecond,
      beforeStats,
      afterStats,
    };

    logger.info(
      summary,
      'Taxonomy Catalog Backfill Complete: %d products in %ds (%d/sec)',
      processedCount,
      durationSeconds,
      throughputPerSecond
    );

    return summary;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (_) {}
    }
    await pool.end();
  }
}

// Runnable CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[++i], 10);
    } else if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (args[i] === '--force') {
      options.forceAll = true;
    }
  }

  runCatalogTaxonomyBackfill(options)
    .then((summary) => {
      console.log('\n======================================================');
      console.log('✅ CATALOG TAXONOMY BACKFILL EXECUTION SUMMARY');
      console.log('======================================================');
      console.log(`Duration:              ${summary.durationSeconds}s (${summary.throughputPerSecond} products/s)`);
      console.log(`Products Processed:    ${summary.productsProcessed} / ${summary.productsTargeted}`);
      console.log(`Products Updated:      ${summary.productsUpdated}`);
      console.log(`Fabrics Enriched:      ${summary.fabricsEnriched}`);
      console.log(`Stitches Enriched:     ${summary.stitchesEnriched}`);
      console.log(`Tags Appended:         ${summary.tagsAppendedTotal}`);
      console.log(`Facets Updated:        ${summary.facetUsageIncrements}`);
      console.log(`Errors:                ${summary.errorsCount}`);
      console.log('------------------------------------------------------');
      console.log('Catalog Fabric Counts:');
      console.log(`  Unknown (Before):    ${summary.beforeStats.fabricUnknown}`);
      console.log(`  Unknown (After):     ${summary.afterStats.fabricUnknown} (resolved ${summary.beforeStats.fabricUnknown - summary.afterStats.fabricUnknown})`);
      console.log('Catalog Stitch Counts:');
      console.log(`  Unknown (Before):    ${summary.beforeStats.stitchUnknown}`);
      console.log(`  Unknown (After):     ${summary.afterStats.stitchUnknown} (resolved ${summary.beforeStats.stitchUnknown - summary.afterStats.stitchUnknown})`);
      console.log('======================================================\n');
      process.exit(summary.errorsCount > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('❌ Fatal error running catalog taxonomy backfill:', err);
      process.exit(1);
    });
}
