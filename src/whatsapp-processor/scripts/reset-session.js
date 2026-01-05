const { Client } = require('pg');
const Redis = require('ioredis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function resetSession() {
    console.log('Resetting session...');

    // Postgres
    const dbString = process.env.VAYYARI_WA_DB_CONNECTION_STRING || process.env.POSTGRES_URL;
    if (dbString) {
        const client = new Client({ connectionString: dbString });
        try {
            await client.connect();
            console.log('Connected to Postgres');

            // Delete all sessions
            const res = await client.query('DELETE FROM wa_auth_sessions');
            console.log(`Deleted ${res.rowCount} rows from wa_auth_sessions`);

            await client.end();
        } catch (err) {
            console.error('Postgres Error:', err.message);
        }
    } else {
        console.warn('No DB connection string found');
    }

    // Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        const redis = new Redis(redisUrl);

        // Find keys pattern
        // The default prefix used in auth.ts is: `wa_session:${sessionId}:`
        // We can just scan for `wa_session:*`

        let cursor = '0';
        let keys = [];
        do {
            const result = await redis.scan(cursor, 'MATCH', 'wa_session:*', 'COUNT', 100);
            cursor = result[0];
            const foundKeys = result[1];
            if (foundKeys.length > 0) {
                keys.push(...foundKeys);
            }
        } while (cursor !== '0');

        console.log(`Found ${keys.length} Redis session keys`);

        if (keys.length > 0) {
            await redis.del(...keys);
            console.log('Deleted Redis session keys');
        }

        redis.disconnect();
    } catch (err) {
        console.error('Redis Error:', err.message);
    }

    console.log('Session reset complete.');
}

resetSession().catch(console.error);
