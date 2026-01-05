import Redis from 'ioredis';
import { REDIS_CONFIG } from '../config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
    if (!redisClient) {
        redisClient = new Redis({
            host: REDIS_CONFIG.host,
            port: REDIS_CONFIG.port,
            password: REDIS_CONFIG.password,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        redisClient.on('connect', () => {
            logger.info('Connected to Redis');
        });

        redisClient.on('error', (err) => {
            logger.error({ err }, 'Redis connection error');
        });
    }

    return redisClient;
};
