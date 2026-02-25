import { Context, Next } from "hono";
import { CompanyService } from "../module/company/company.service.js";
import { ApiError } from "../lib/errors/api.error.js";

export async function CompanyMiddleware(c: Context, next: Next) {
    const company = await CompanyService.get();

    // if (!company?.id) {
    //     throw new ApiError(401, "Session perusahaan tidak valid atau telah berakhir");
    // }

    // Simpan context
    c.set("company", company ?? null);
    c.set("company_id", company?.id ?? null);

    await next();
}
