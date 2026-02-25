import { CacheUtils } from "../../cache/utils.js";
import { env } from "../../config/env.js";
import prisma from "../../config/prisma.js";
import { ApiError } from "../../lib/errors/api.error.js";
import { RequestCompanyDTO, ResponseCompanyDTO } from "./company.schema.js";

export class CompanyService {
    static async upsert(
        body: RequestCompanyDTO,
    ): Promise<Omit<ResponseCompanyDTO, "created_at" | "updated_at">> {
        const company = await prisma.company.findFirst();
        await CacheUtils.invalidate(env.COMPANY_CACHE);
        if (!company) {
            return prisma.company.create({
                data: body,
                select: {
                    id: true,
                    name: true,
                    logo: true,
                    description: true,
                    established_at: true,
                    legal_name: true,
                },
            });
        }
        return await prisma.company.update({
            where: {
                id: company.id,
            },
            data: body,
            select: {
                id: true,
                name: true,
                logo: true,
                description: true,
                established_at: true,
                legal_name: true,
            },
        });
    }

    private static async find(): Promise<Omit<
        ResponseCompanyDTO,
        "created_at" | "updated_at"
    > | null> {
        return await prisma.company.findFirst({
            select: {
                id: true,
                name: true,
                legal_name: true,
                established_at: true,
                description: true,
                logo: true,
            },
        });
    }

    static async get(): Promise<Omit<ResponseCompanyDTO, "created_at" | "updated_at"> | null> {
        const cache_key = env.COMPANY_CACHE;
        const cached = await CacheUtils.getWithBackgroundRefresh<
            Omit<ResponseCompanyDTO, "created_at" | "updated_at">
        >(cache_key, async () => {
            return this.find();
        });

        if (cached) return cached;

        // 2. Cache MISS → blocking fetch
        const data = await this.find();
        if (!data) {
            return null;
        }

        // 3. Set cache (non-blocking)
        CacheUtils.set<Omit<ResponseCompanyDTO, "created_at" | "updated_at">>(
            data,
            cache_key,
            env.COMPANY_EX,
        ).catch((error) => {
            console.error("Async cache set failed:", error);
        });

        return data;
    }

    static async changeLogo(newLogoUrl: string) {
        const company = await prisma.company.findFirst();
        await CacheUtils.invalidate(env.COMPANY_CACHE);
        if (!company) {
            throw new ApiError(404, "Perusahaan belum diatur");
        }
        return await prisma.company.update({
            where: {
                id: company.id,
            },
            data: {
                logo: newLogoUrl,
            },
            select: {
                id: true,
                name: true,
                logo: true,
                description: true,
                established_at: true,
                legal_name: true,
            },
        });
    }
}
