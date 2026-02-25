import { Context } from "hono";
import { AuthorService } from "./author.service.js";
import { ApiResponse } from "../../../lib/api.response.js";
import { QueryAuthorDTO } from "./author.schema.js";

export class AuthorController {
    static async create(c: Context) {
        const body = c.get("body");
        await AuthorService.create(body);
        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async update(c: Context) {
        const id = c.req.param("id");
        const body = c.get("body");
        await AuthorService.update(Number(id), body);
        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async deleteMany(c: Context) {
        const body = await c.req.json<Array<number>>();
        const result = await AuthorService.deleteMany(body);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async restoreMany(c: Context) {
        const body = await c.req.json<Array<number>>();
        const result = await AuthorService.restoreMany(body);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async destroyMany(c: Context) {
        const body = await c.req.json<Array<number>>();
        const result = await AuthorService.destroyMany(body);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async list(c: Context) {
        const { page, take, sortBy, sortOrder, search, status } = c.req.query();

        const params: QueryAuthorDTO = {
            status: (status as QueryAuthorDTO["status"]) ?? "active",
            page: Number(page) || 1,
            sortBy: sortBy as QueryAuthorDTO["sortBy"],
            sortOrder: sortOrder as QueryAuthorDTO["sortOrder"],
            take: Number(take) || 10,
            search,
        };

        const rest = await AuthorService.list(params);
        return ApiResponse.sendSuccess(c, rest, 200, params);
    }

    static async detail(c: Context) {
        const id = c.req.param("id");

        const rest = await AuthorService.detail(Number(id));
        return ApiResponse.sendSuccess(c, rest, 200);
    }
}
