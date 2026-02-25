import { ApiError } from "../../../../lib/errors/api.error.js";
import { Context } from "hono";
import { RequestAddressDTO } from "./address.schema.js";
import { AddressService } from "./address.service.js";
import { SessionManager } from "../../../../lib/session.management.js";
import { getCookie } from "hono/cookie";
import { env } from "../../../../config/env.js";
import { ApiResponse } from "../../../../lib/api.response.js";
import { CreateLogger } from "../../log/log.service.js";
import { addressHttp } from "./address.client.js";

export class AddressController {
    static async create(c: Context) {
        const session = c.get("session");
        const body: RequestAddressDTO = c.get("body");
        const address = await AddressService.create(session.sub, body);
        if (address && session) {
            await CreateLogger({
                account_id: session.sub,
                activity: "CREATE",
                description: `Create Users Address ${address.id}`,
                resource: "Users Address",
            });
        }
        if (address) {
            const sessionId = getCookie(c, env.SESSION_COOKIE_NAME) || "";
            await SessionManager.updateSessionData(sessionId, {
                ...session,
                address,
            });
        }

        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async update(c: Context) {
        const id = c.req.param("id");
        if (!id) throw new ApiError(400, "Alamat tidak valid");
        const session = c.get("session");

        const body: RequestAddressDTO = c.get("body");
        const address = await AddressService.update(session.sub, body, Number(id));
        if (address && session) {
            await CreateLogger({
                account_id: session.sub,
                activity: "UPDATE",
                description: `Update Users Address ${address.id}`,
                resource: "Users Address",
            });
        }
        if (address) {
            const sessionId = getCookie(c, env.SESSION_COOKIE_NAME) || "";
            await SessionManager.updateSessionData(sessionId, {
                ...session,
                address,
            });
        }

        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async list(c: Context) {
        const account_id = c.get("session").sub;

        const result = await AddressService.list(account_id);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async detail(c: Context) {
        const account_id = c.get("session").sub;
        const id = c.req.param("id");

        const result = await AddressService.detail(account_id, Number(id));
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async deleted(c: Context) {
        const account_id = c.get("session").sub;
        const id = c.req.param("id");
        if (!id) throw new ApiError(400, "Alamat tidak valid");

        const result = await AddressService.deleted(account_id, Number(id));
        if (account_id && result) {
            await CreateLogger({
                account_id: account_id,
                activity: "DELETE",
                description: `Delete Users Address ${id}`,
                resource: "Users Address",
            });
        }
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async changePrimary(c: Context) {
        const session = c.get("session");
        const id = c.req.param("id");
        if (!id) throw new ApiError(400, "Alamat tidak valid");

        const address = await AddressService.changePrimary(session.sub, Number(id));
        const sessionId = getCookie(c, env.SESSION_COOKIE_NAME) || "";
        await SessionManager.updateSessionData(sessionId, {
            ...session,
            address,
        });
        if (address && session) {
            await CreateLogger({
                account_id: session.sub,
                activity: "UPDATE",
                description: `Change Primary Users Address ${address.id}`,
                resource: "Users Address",
            });
        }
        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async province(c: Context) {
        try {
            const { data } = await addressHttp.get("/provinsi/get");
            return ApiResponse.sendSuccess(c, data.result, 200);
        } catch (err: any) {
            console.error("Error fetching province:", {
                message: err.message,
                response: err.response?.data,
            });

            throw new ApiError(err.response?.status ?? 502, "Failed to fetch province data");
        }
    }

    static async city(c: Context) {
        const { province_id } = c.req.query();
        try {
            const { data } = await addressHttp.get("/kabkota/get/", {
                params: {
                    d_provinsi_id: Number(province_id),
                },
            });

            return ApiResponse.sendSuccess(c, data.result, 200);
        } catch (err: any) {
            console.error("Error fetching city:", {
                province_id,
                message: err.message,
            });

            throw new ApiError(err.response?.status ?? 502, "Failed to fetch city data");
        }
    }

    static async district(c: Context) {
        const { city_id } = c.req.query();

        try {
            const { data } = await addressHttp.get("/kecamatan/get/", {
                params: {
                    d_kabkota_id: Number(city_id),
                },
            });

            return ApiResponse.sendSuccess(c, data.result, 200);
        } catch (err: any) {
            console.error("Error fetching district:", {
                city_id,
                message: err.message,
            });

            throw new ApiError(err.response?.status ?? 502, "Failed to fetch district data");
        }
    }

    static async subdistrict(c: Context) {
        const { district_id } = c.req.query();

        try {
            const { data } = await addressHttp.get("/kelurahan/get/", {
                params: {
                    d_kecamatan_id: Number(district_id),
                },
            });

            return ApiResponse.sendSuccess(c, data.result, 200);
        } catch (err: any) {
            console.error("Error fetching subdistrict:", {
                district_id,
                message: err.message,
            });

            throw new ApiError(err.response?.status ?? 502, "Failed to fetch subdistrict data");
        }
    }
}
