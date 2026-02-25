import { env } from "../config/env.js";
import { redisClient } from "../config/redis.js";
import { ROLE } from "../generated/prisma/enums.js";
import { ApiError } from "../lib/errors/api.error.js";
import { logger } from "../lib/logger.js";
import { sessionCache } from "../lib/session.management.js";
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { ContentfulStatusCode } from "hono/utils/http-status";

const CACHE_TTL = 300; // 5 menit

export const authMiddleware = async (c: Context, next: Next) => {
    try {
        // 1. Baca session ID dari cookie
        const sessionId = getCookie(c, env.SESSION_COOKIE_NAME);
        if (!sessionId) {
            throw new ApiError(401, "Unauthorized, please login to access our system");
        }

        let sessionData: Record<string, any> | null = null;
        const now = Date.now();
        const sessionKey = `session:${sessionId}`;

        // 2. Check cache terlebih dahulu
        const cached = sessionCache.get(sessionId);
        if (cached && cached.expiry > now) {
            sessionData = cached.data;
        } else {
            // 3. Ambil dari Redis dengan pengecekan tipe data
            const type = await redisClient.type(sessionKey);

            if (type === "hash") {
                // Data disimpan sebagai hash
                sessionData = await redisClient.hgetall(sessionKey);

                // Parse user object if exists
                if (sessionData.user && typeof sessionData.user === "string") {
                    try {
                        sessionData.user = JSON.parse(sessionData.user);
                    } catch (e) {
                        console.error("Error parsing user data:", e);
                    }
                }
            } else if (type === "string") {
                // Data disimpan sebagai string (backward compatibility)
                const raw = await redisClient.get(sessionKey);
                if (raw) {
                    try {
                        sessionData = JSON.parse(raw);
                    } catch {
                        await redisClient.del(sessionKey);
                        throw new ApiError(500, "Corrupted session data");
                    }
                }
            } else {
                // Tipe data tidak didukung
                throw new ApiError(401, "Unauthorized, please login to access our system");
            }

            // Jika tidak ada data session
            if (!sessionData || Object.keys(sessionData).length === 0) {
                sessionCache.delete(sessionId);
                throw new ApiError(401, "Unauthorized: invalid or expired session");
            }

            // Cache untuk request berikutnya
            sessionCache.set(sessionId, {
                data: sessionData,
                expiry: now + CACHE_TTL * 1000,
            });
        }

        // 5. Inject ke context
        c.set("session", sessionData);
        c.set("role", sessionData?.role || "MEMBER");
        c.set("permissions", sessionData?.employee?.permissions || []);
        c.set("sessionId", sessionId);

        // 6. Background task: Extend TTL (sliding session)
        // Jangan await agar tidak block request
        extendSessionTTL(sessionKey).catch(console.error);

        await next();
    } catch (err) {
        if (err instanceof ApiError) {
            return c.json(
                { success: false, message: err.message },
                err.statusCode as ContentfulStatusCode,
            );
        }
        return c.json({ success: false, message: (err as Error).message }, 401);
    }
};

// Helper function untuk extend TTL secara background
async function extendSessionTTL(sessionKey: string) {
    try {
        const ttl = env.SESSION_TTL;
        if (ttl > 0) {
            await redisClient.expire(sessionKey, ttl);
        }
    } catch (error) {
        console.error("Failed to extend session TTL:", error);
    }
}

// Periodic cleanup cache
setInterval(() => {
    const now = Date.now();
    sessionCache.forEach((value, key) => {
        if (value.expiry <= now) {
            sessionCache.delete(key);
        }
    });
}, 60000);

export const roleMiddleware = (
    allowedRoles?: ROLE[],
    // allowedPermissions?: PERMISSION[]
) => {
    // export const roleMiddleware = (allowedRoles?: ROLE[]) => {
    return async (c: Context, next: Next) => {
        const userRole = c.get("role") as ROLE;
        if (!userRole) throw new ApiError(401, "Unauthorized");

        // const userPermissions = c.get("permissions") as PERMISSION[];
        // if (userRole === "STAFF") {
        // 	if (!Array.isArray(userPermissions)) {
        // 		throw new ApiError(403, "Invalid permission format");
        // 	}
        // 	const hasPermission = userPermissions.some((p) => allowedPermissions?.includes(p));
        // 	if (!hasPermission) {
        // 		throw new ApiError(403, "Forbidden: insufficient permission");
        // 	}
        // }

        if (env.isProd && !allowedRoles?.includes(userRole)) {
            throw new ApiError(403, "Forbidden: insufficient role");
        }

        await next();
    };
};
