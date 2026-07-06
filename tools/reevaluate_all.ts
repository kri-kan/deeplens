/**
 * tools/reevaluate_all.ts
 *
 * One-time admin script: fetches all product IDs and triggers bulk re-evaluation
 * via the WhatsApp products API.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." API_BASE_URL="http://localhost:5000" npx ts-node tools/reevaluate_all.ts
 *
 * Required env vars:
 *   DATABASE_URL   - PostgreSQL connection string (e.g. postgresql://user:pass@host:5432/db)
 *   API_BASE_URL   - Base URL of the DeepLens Search API (default: http://localhost:5000)
 */
import { Client } from 'pg';
// @ts-ignore
import fetch from 'node-fetch';

const DATABASE_URL = process.env.DATABASE_URL;
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000';

if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required.');
    console.error('Usage: DATABASE_URL="postgresql://user:pass@host:5432/db" npx ts-node tools/reevaluate_all.ts');
    process.exit(1);
}

async function reevaluateAllProducts() {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        const res = await client.query('SELECT id FROM products WHERE is_deleted = FALSE OR is_deleted IS NULL');
        const productIds = res.rows.map(row => row.id);

        console.log(`Found ${productIds.length} products. Triggering re-evaluation via ${API_BASE_URL}...`);

        const CHUNK_SIZE = 50;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
            const chunk = productIds.slice(i, i + CHUNK_SIZE);
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/whatsapp/products/reevaluate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productIds: chunk }),
                });

                if (response.ok) {
                    successCount += chunk.length;
                    console.log(`Processed chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(productIds.length / CHUNK_SIZE)}, total successful: ${successCount}`);
                } else {
                    failCount += chunk.length;
                    console.error(`Failed chunk ${Math.floor(i / CHUNK_SIZE) + 1}: HTTP ${response.status}`);
                }
            } catch (err) {
                failCount += chunk.length;
                console.error(`Error processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`, err);
            }
        }

        console.log(`\nCompleted. Success: ${successCount}, Failed: ${failCount}`);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

reevaluateAllProducts().catch(console.error);
