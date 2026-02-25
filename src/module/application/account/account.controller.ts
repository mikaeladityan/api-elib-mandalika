import { Context } from "hono";
import { SessionManager } from "../../../lib/session.management.js";
import { ApiResponse } from "../../../lib/api.response.js";
import { getCookie } from "hono/cookie";
import { env } from "../../../config/env.js";

export class AccountController {
    static async getActiveSessions(c: Context) {
        const email = c.get("session").email;
        const sessions = await SessionManager.getUserActiveSessions(email, c);
        return ApiResponse.sendSuccess(c, sessions, 200);
    }

    static async logoutAllDevices(c: Context) {
        const email = c.get("session").email;
        const currentSessionId = getCookie(c, env.SESSION_COOKIE_NAME) || "";

        const revokedCount = await SessionManager.revokeOtherUserSessions(
            email,
            currentSessionId,
            c,
        );

        return ApiResponse.sendSuccess(
            c,
            {
                message: `Logged out from ${revokedCount} other devices`,
            },
            200,
        );
    }
}
