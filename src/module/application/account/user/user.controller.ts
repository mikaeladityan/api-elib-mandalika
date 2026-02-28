import { ApiError } from "../../../../lib/errors/api.error.js";
import { Context } from "hono";
import { RequestUserDTO } from "./user.schema.js";
import { UserService } from "./user.service.js";
import { ApiResponse } from "../../../../lib/api.response.js";
import { getCookie } from "hono/cookie";
import { env } from "../../../../config/env.js";
import { SessionManager } from "../../../../lib/session.management.js";
import { CreateLogger } from "../../log/log.service.js";
import { handleFileUpload } from "../../../../lib/uploader.js";

export class UserController {
    static async upsert(c: Context) {
        const session = c.get("session");
        if (!session.email) throw new ApiError(400, "Email is required!");

        const body: RequestUserDTO = c.get("body");
        const user = await UserService.upsert(session.email, body);

        if (user) {
            await CreateLogger({
                account_id: session.sub,
                activity: "UPDATE",
                description: "Create or Update Account Users",
                resource: "Users",
            });
        }
        const sessionId = getCookie(c, env.SESSION_COOKIE_NAME) || "";
        await SessionManager.updateSessionData(sessionId, {
            ...session,
            user: {
                first_name: user.first_name,
                last_name: user.last_name,
                photo: user.photo,
                phone: user.phone,
                whatsapp: user.whatsapp,
            },
        });

        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async changePhoto(c: Context) {
        const session = c.get("session");
        const newPhotoUrl = await handleFileUpload(c, {
            fieldName: "photo",
            folderPath: "users/",
            userId: session.sub,
            maxSize: 5 * 1024 * 1024,
            allowedExtensions: [".webp", ".jpeg", ".jpg", ".png"],
        });

        await UserService.photo(session.sub, newPhotoUrl);
        const sessionId = getCookie(c, env.SESSION_COOKIE_NAME) || "";
        await SessionManager.updateSessionData(sessionId, {
            ...session,
            user: {
                ...session.user,
                photo: newPhotoUrl,
            },
        });
        return ApiResponse.sendSuccess(c, undefined, 201);
    }
}
