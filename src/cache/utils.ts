import { redisClient } from "../config/redis.js";

export class CacheUtils {
    static async get<T>(cache_key: string): Promise<T | null> {
        try {
            const cached = await redisClient.get(cache_key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error("Company cache get error:", error);
            return null;
        }
    }

    static async set<T>(data: T, cache_key: string, ex: number): Promise<boolean> {
        try {
            await redisClient.set(cache_key, JSON.stringify(data), "EX", ex);
            return true;
        } catch (error) {
            console.error("Company cache set error:", error);
            return false;
        }
    }

    static async invalidate(cache_key: string): Promise<boolean> {
        try {
            await redisClient.del(cache_key);
            return true;
        } catch (error) {
            console.error("Company cache invalidate error:", error);
            return false;
        }
    }

    // Optional: Get cache dengan stale-while-revalidate
    static async getWithBackgroundRefresh<T>(
        cache_key: string,
        refresh_fn: () => Promise<T | null>,
        ttl_seconds?: number,
    ): Promise<T | null> {
        try {
            const cached = await redisClient.get(cache_key);
            if (!cached) return null;

            // Background refresh jika cache hampir expired
            const ttl = await redisClient.ttl(cache_key);
            if (ttl < (ttl_seconds || 1200)) {
                this.triggerBackgroundRefresh(cache_key, refresh_fn, ttl_seconds || 1200);
            }

            return JSON.parse(cached);
        } catch (error) {
            console.error("Cache get with refresh error:", error);
            return null;
        }
    }

    private static triggerBackgroundRefresh<T>(
        cacheKey: string,
        refreshFn: () => Promise<T>,
        ttlSeconds: number,
    ) {
        setImmediate(async () => {
            try {
                const freshData = await refreshFn();

                await redisClient.set(cacheKey, JSON.stringify(freshData), "EX", ttlSeconds);

                console.log(`Cache refreshed: ${cacheKey}`);
            } catch (error) {
                console.error(`Background refresh failed: ${cacheKey}`, error);
            }
        });
    }
}
