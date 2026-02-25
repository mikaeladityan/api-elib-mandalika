import { Context, Next } from "hono";
import { LEVEL_APP } from "../generated/prisma/enums.js";
import { ApiError } from "../lib/errors/api.error.js";
import { env } from "../config/env.js";

/**
 * Middleware untuk membatasi akses berdasarkan level aplikasi (Package Level).
 * @param allowedLevels Array berisi LEVEL_APP yang diizinkan mengakses route ini.
 */
export function levelAppMiddleware(allowedLevels: LEVEL_APP[]) {
    return async (c: Context, next: Next) => {
        // Non-prod: bypass total untuk memudahkan development
        if (!env.isProd) {
            return await next();
        }

        // Mengambil data company dari context
        // (Pastikan authMiddleware sudah melakukan c.set("company", ...))
        const company = c.get("company") as { level_app?: LEVEL_APP };

        if (!company?.level_app) {
            throw new ApiError(400, "Level aplikasi perusahaan tidak ditemukan");
        }

        // Cek apakah level perusahaan saat ini ada dalam daftar level yang diizinkan
        const hasAccess = allowedLevels.includes(company.level_app);

        if (!hasAccess) {
            throw new ApiError(
                403,
                `Fitur ini tidak tersedia untuk paket ${company.level_app}. ` +
                    `Hanya tersedia untuk: ${allowedLevels.join(", ")}`,
            );
        }

        await next();
    };
}

/**
 * Middleware untuk membatasi akses berdasarkan level aplikasi (Blacklist approach).
 * @param excludedLevels Array berisi LEVEL_APP yang TIDAK diperbolehkan mengakses route ini.
 */
export function levelGuardMiddlewares(excludedLevels: LEVEL_APP[]) {
    return async (c: Context, next: Next) => {
        // Non-prod: bypass total
        if (!env.isProd) {
            return await next();
        }

        const company = c.get("company") as { level_app?: LEVEL_APP };

        if (!company?.level_app) {
            throw new ApiError(400, "Level aplikasi perusahaan tidak ditemukan");
        }

        // Cek apakah level perusahaan saat ini termasuk yang dilarang
        const isForbidden = excludedLevels.includes(company.level_app);

        if (isForbidden) {
            throw new ApiError(403, `Fitur ini tidak tersedia untuk paket ${company.level_app}`);
        }

        await next();
    };
}
