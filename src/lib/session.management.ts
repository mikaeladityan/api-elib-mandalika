import { env } from "../config/env.js";
import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { redisClient } from "../config/redis.js";
import { Account } from "../generated/prisma/client.js";
import { ResponseAddressDTO } from "../module/application/account/address/address.schema.js";
import { ResponseUserDTO } from "../module/application/account/user/user.schema.js";

type AccountResDTO = Omit<
    Account & {
        user: ResponseUserDTO;
        address: ResponseAddressDTO;
    },
    "password" | "created_at" | "updated_at" | "deleted_at" | "id"
>;

// Cache session data dalam memory untuk mengurangi Redis calls
export const sessionCache = new Map<string, { data: any; expiry: number }>();

export class SessionManager {
    static async updateSessionData(sessionId: string, data: Partial<AccountResDTO>): Promise<void> {
        const sessionKey = `session:${sessionId}`;

        const raw = await redisClient.get(sessionKey);
        if (!raw) return;

        let existing: Record<string, any>;
        try {
            existing = JSON.parse(raw);
        } catch {
            // session corrupt → hapus
            await redisClient.del(sessionKey);
            return;
        }

        const updatedSession = {
            ...existing,
            ...data,
            lastActivity: Date.now(),
        };

        await redisClient.set(sessionKey, JSON.stringify(updatedSession), "KEEPTTL");

        sessionCache.delete(sessionId);
    }

    static async cleanupInactiveSessions(maxInactiveHours = 24, batchSize = 500): Promise<number> {
        const pattern = "session:*";
        const cutoffTime = Date.now() - maxInactiveHours * 60 * 60 * 1000;

        let cursor = "0";
        let cleanedCount = 0;

        do {
            const [nextCursor, keys] = await redisClient.scan(
                cursor,
                "MATCH",
                pattern,
                "COUNT",
                batchSize,
            );

            cursor = nextCursor;
            if (keys.length === 0) continue;

            const values = await redisClient.mget(...keys);
            const pipeline = redisClient.pipeline();

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const raw = values[i];

                if (!raw) {
                    pipeline.del(String(key));
                    cleanedCount++;
                    continue;
                }

                try {
                    const session = JSON.parse(raw);
                    if ((session.lastActivity || 0) < cutoffTime) {
                        pipeline.del(String(key));
                        cleanedCount++;
                    }
                } catch {
                    pipeline.del(String(key));
                    cleanedCount++;
                }
            }

            if (pipeline.length > 0) {
                await pipeline.exec();
            }
        } while (cursor !== "0");

        return cleanedCount;
    }

    static getCurrentSessionId(c: Context): string | null {
        try {
            // Gunakan getCookie untuk mendapatkan nilai cookie
            return getCookie(c, env.SESSION_COOKIE_NAME) || null;
        } catch (error) {
            console.error("Error getting session cookie:", error);
            return null;
        }
    }

    static async getUserActiveSessions(
        email: string,
        c: Context,
    ): Promise<
        Array<{
            sessionId: string;
            lastActivity: number;
            createdAt: number;
            userAgent?: string;
            ipAddress?: string;
            location?: string;
            isCurrent?: boolean;
        }>
    > {
        const pattern = "session:*";
        const currentSessionId = this.getCurrentSessionId(c);

        let cursor = "0";
        const sessions: any[] = [];

        do {
            const [nextCursor, keys] = await redisClient.scan(
                cursor,
                "MATCH",
                pattern,
                "COUNT",
                200,
            );

            cursor = nextCursor;
            if (keys.length === 0) continue;

            const values = await redisClient.mget(...keys);

            for (let i = 0; i < keys.length; i++) {
                const raw = values[i];
                if (!raw) continue;

                try {
                    const session = JSON.parse(raw);
                    if (session.email !== email) continue;

                    const sessionId = keys[i]?.replace("session:", "");

                    sessions.push({
                        sessionId,
                        lastActivity: session.lastActivity ?? Date.now(),
                        createdAt: session.createdAt ?? Date.now(),
                        userAgent: session.userAgent,
                        ipAddress: session.ip,
                        isCurrent: sessionId === currentSessionId,
                    });
                } catch {
                    continue;
                }
            }
        } while (cursor !== "0");

        return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    }

    static async revokeOtherUserSessions(
        email: string,
        currentSessionId: string,
        c: Context,
    ): Promise<number> {
        const userSessions = await this.getUserActiveSessions(email, c);
        const sessionsToRevoke = userSessions
            .filter((session) => session.sessionId !== currentSessionId)
            .map((session) => `session:${session.sessionId}`);

        if (sessionsToRevoke.length > 0) {
            await redisClient.del(sessionsToRevoke);
            for (const sessionId of sessionsToRevoke) {
                sessionCache.delete(sessionId.replace("session:", ""));
            }
        }

        return sessionsToRevoke.length;
    }
}

// static async createMultipleSessions(
// 	sessions: Array<{
// 		email: string;
// 		data: AccountResDTO;
// 		ttl?: number;
// 	}>
// ): Promise<string[]> {
// 	const pipeline = redisClient.pipeline();
// 	const sessionIds: string[] = [];

// 	for (const session of sessions) {
// 		const sessionId = uuid();
// 		const sessionKey = `session:${sessionId}`;
// 		const ttl = session.ttl || env.SESSION_TTL;
// 		const sessionData = {
// 			...session.data,
// 			createdAt: Date.now().toString(),
// 			lastActivity: Date.now().toString(),
// 		};

// 		// Save as hash
// 		pipeline.set(sessionKey, JSON.stringify(sessionData));
// 		pipeline.expire(sessionKey, ttl);

// 		sessionIds.push(sessionId);
// 	}

// 	await pipeline.exec();
// 	return sessionIds;
// }

// static async getSessionWithFallback(sessionId: string): Promise<AccountResDTO | null> {
// 	try {
// 		const sessionKey = `session:${sessionId}`;
// 		const type = await redisClient.type(sessionKey);

// 		let sessionData: any = {};
// 		if (type === "hash") {
// 			sessionData = await redisClient.hgetall(sessionKey);
// 		} else if (type === "string") {
// 			const data = await redisClient.get(sessionKey);
// 			if (data) sessionData = JSON.parse(data);
// 		}

// 		// Parse user object if exists
// 		if (sessionData.user && typeof sessionData.user === "string") {
// 			try {
// 				sessionData.user = JSON.parse(sessionData.user);
// 			} catch (e) {
// 				console.error("Error parsing user data:", e);
// 			}
// 		}

// 		return sessionData;
// 	} catch (error) {
// 		console.error("Session retrieval error:", error);
// 		return null;
// 	}
// }

// static async revokeOtherUserSessions(
//     email: string,
//     currentSessionId: string,
//     c: Context
// ): Promise<number> {
//     const userSessions = await this.getUserActiveSessions(email, c);
//     const sessionsToRevoke = userSessions
//         .filter((session) => session.sessionId !== currentSessionId)
//         .map((session) => `session:${session.sessionId}`);

//     if (sessionsToRevoke.length > 0) {
//         await redisClient.del(sessionsToRevoke);
//         for (const sessionId of sessionsToRevoke) {
//             sessionCache.delete(sessionId.replace("session:", ""));
//         }
//     }

//     return sessionsToRevoke.length;
// }

// static async migrateSessions(): Promise<number> {
//     const keys = await redisClient.keys("session:*");
//     let migrated = 0;

//     for (const key of keys) {
//         try {
//             const type = await redisClient.type(key);
//             if (type !== "string") continue;

//             const data = await redisClient.get(key);
//             if (!data) continue;

//             const ttl = await redisClient.ttl(key);
//             const sessionData = JSON.parse(data);

//             await redisClient.del(String(key));
//             await redisClient.set(key, JSON.stringify(sessionData));
//             if (ttl > 0) await redisClient.expire(key, ttl);

//             migrated++;
//         } catch (error) {
//             console.error(`Migration error for ${key}:`, error);
//         }
//     }

//     return migrated;
// }
