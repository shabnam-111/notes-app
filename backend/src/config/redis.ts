import Redis from 'ioredis';
import { config } from './index';

let redisClient: Redis | null = null;

try {
  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('[Redis] Max retries reached. Running without Redis cache.');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.connect().catch((err) => {
    console.warn(`[Redis] Optional connection failed (${err.message}). Background jobs will run direct/in-process.`);
  });
} catch (error: any) {
  console.warn(`[Redis] Init error: ${error.message}`);
}

export const redis = redisClient;
