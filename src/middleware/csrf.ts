// src/middlewares/csrf.ts
import type { Context, Next } from "hono";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { ApiError } from "../lib/errors/api.error.js";
import { redisClient } from "../config/redis.js";
const CSRF_EXEMPT_ROUTES = ["GET:/csrf", "GET:/health", "OPTIONS:*"];

export const csrfMiddleware = async (c: Context, next: Next) => {
    const method = c.req.method;
    const path = c.req.path;
    const routeKey = `${method}:${path}`;

    // 1. Lewati jika route dikecualikan
    const isExempt = CSRF_EXEMPT_ROUTES.some((pattern) => {
        if (pattern === "*") return true;
        if (pattern.endsWith(":*")) {
            const [exemptMethod] = pattern.split(":");
            return exemptMethod === method;
        }
        return pattern === routeKey;
    });
    if (isExempt) {
        return next();
    }

    // 2. Lewati jika method GET/HEAD/OPTIONS
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
        return next();
    }

    // 3. Ambil header CSRF dan sessionId dari context
    const csrfToken = c.req.header(env.CSRF_HEADER_NAME);
    const sessionId = c.get(env.SESSION_COOKIE_NAME) as string; // sebelumnya di‐set di sessionMiddleware

    logger.info(`CSRF: ${csrfToken}\nSESSION: ${sessionId}`);
    // 4. Jika tidak ada CSRF atau sessionId, tolak
    if (!csrfToken || !sessionId) {
        logger.warn("CSRF token or session missing", {
            path,
            method,
            hasToken: !!csrfToken,
            hasSession: !!sessionId,
        });
        throw new ApiError(403, "CSRF token or session missing");
    }

    try {
        // 5. Ambil token dari Redis
        const storedToken = await redisClient.get(`csrf:${sessionId}`);

        // Bandingka
        if (storedToken !== csrfToken) {
            logger.warn("CSRF token mismatch", {
                path,
                method,
                sessionId,
                storedToken,
                receivedToken: csrfToken,
            });
            throw new ApiError(403, "Invalid CSRF token");
        }

        // 6. Token valid → lanjut
        await next();
    } catch (err) {
        logger.error("CSRF validation failed", {
            error: (err as Error).message,
        });
        throw new ApiError(403, "CSRF validation failed");
    }
};
