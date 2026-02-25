import { Context } from "hono";
import { CompanyService } from "./company.service.js";
import { ApiResponse } from "../../lib/api.response.js";
import { redisClient } from "../../config/redis.js";
import { env } from "../../config/env.js";

import { CreateLogger } from "../application/log/log.service.js";
import { handleFileUpload } from "../../lib/uploader.js";

export class CompanyController {
    static async upsert(c: Context) {
        const body = c.get("body");
        const result = await CompanyService.upsert(body);

        const account = c.get("session")?.sub;

        if (result && account) {
            await CreateLogger({
                activity: "UPDATE",
                description: `Upsert COMPANY ${result.id}`,
                account_id: account,
                resource: "Company",
            });
        }

        const existingCompany = c.get("company");

        const mergedCompany = {
            ...existingCompany,
            ...result,
        };

        const sessionKey = env.COMPANY_CACHE;
        await redisClient.set(sessionKey, JSON.stringify(mergedCompany), "EX", env.COMPANY_EX);
        return ApiResponse.sendSuccess(c, mergedCompany, 200);
    }

    static async get(c: Context) {
        const rest = c.get("company");
        return ApiResponse.sendSuccess(c, rest, 200);
    }

    static async changeLogo(c: Context) {
        const newLogoUrl = await handleFileUpload(c, {
            fieldName: "logo",
            folderPath: "company/",
            maxSize: 5 * 1024 * 1024,
            allowedExtensions: [".webp", ".jpeg", ".jpg", ".png"],
        });

        const result = await CompanyService.changeLogo(newLogoUrl);

        const account = c.get("session")?.sub;

        if (result && account) {
            await CreateLogger({
                activity: "UPDATE",
                description: `Change Photo ${result.logo}`,
                account_id: account,
                resource: "Company",
            });
        }

        const existingCompany = c.get("company");

        const mergedCompany = {
            ...existingCompany,
            ...result,
        };

        const sessionKey = env.COMPANY_CACHE;
        await redisClient.set(sessionKey, JSON.stringify(mergedCompany), "EX", env.COMPANY_EX);
        return ApiResponse.sendSuccess(c, mergedCompany, 200);
    }
}
