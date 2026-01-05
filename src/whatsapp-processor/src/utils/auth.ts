import {
    AuthenticationCreds,
    AuthenticationState,
    BufferJSON,
    initAuthCreds,
    proto,
    SignalDataSet,
    SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { getWhatsAppDbClient } from '../clients/db.client';
import { getRedisClient } from '../clients/redis.client';
import { logger } from './logger';

/**
 * Custom PostgreSQL Auth Adapter for Baileys with Redis Caching
 */
export const usePostgresAuthState = async (sessionId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const client = getWhatsAppDbClient();
    const redis = getRedisClient();

    if (!client) {
        throw new Error('Database client not available for Postgres Auth State');
    }

    const redisKeyPrefix = `wa_session:${sessionId}:`;

    const readData = async (keyId: string) => {
        try {
            // Check Redis cache first
            const cached = await redis.get(redisKeyPrefix + keyId);
            if (cached) {
                return JSON.parse(cached, BufferJSON.reviver);
            }

            // Hit Database
            const res = await client.query(
                'SELECT data FROM wa_auth_sessions WHERE session_id = $1 AND key_id = $2',
                [sessionId, keyId]
            );

            if (res.rows.length > 0) {
                const data = res.rows[0].data;
                // Cache in Redis (TTL 1 hour)
                await redis.set(redisKeyPrefix + keyId, data, 'EX', 3600);
                return JSON.parse(data, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            logger.error({ error, sessionId, keyId }, 'Error reading auth data from Postgres/Redis');
            return null;
        }
    };

    const writeData = async (data: any, keyId: string) => {
        try {
            const jsonStr = JSON.stringify(data, BufferJSON.replacer);

            // Update Database
            await client.query(
                `INSERT INTO wa_auth_sessions (session_id, key_id, data) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (session_id, key_id) 
                 DO UPDATE SET data = EXCLUDED.data, created_at = EXTRACT(EPOCH FROM NOW()) * 1000`,
                [sessionId, keyId, jsonStr]
            );

            // Update Redis cache
            await redis.set(redisKeyPrefix + keyId, jsonStr, 'EX', 3600);
        } catch (error) {
            logger.error({ error, sessionId, keyId }, 'Error writing auth data to Postgres/Redis');
        }
    };

    const removeData = async (keyId: string) => {
        try {
            // Remove from Database
            await client.query(
                'DELETE FROM wa_auth_sessions WHERE session_id = $1 AND key_id = $2',
                [sessionId, keyId]
            );
            // Remove from Redis
            await redis.del(redisKeyPrefix + keyId);
        } catch (error) {
            logger.error({ error, sessionId, keyId }, 'Error removing auth data from Postgres/Redis');
        }
    };

    // Load credentials
    const credsData = await readData('creds');
    const creds: AuthenticationCreds = credsData || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
                    const data: { [id: string]: SignalDataTypeMap[T] } = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value as SignalDataTypeMap[T];
                        })
                    );
                    return data;
                },
                set: async (data: SignalDataSet) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        const categoryData = data[category as keyof SignalDataSet];
                        if (categoryData) {
                            for (const id in categoryData) {
                                const value = categoryData[id];
                                const key = `${category}-${id}`;
                                if (value) {
                                    tasks.push(writeData(value, key));
                                } else {
                                    tasks.push(removeData(key));
                                }
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            await writeData(creds, 'creds');
        }
    };
};
