import { Context } from "hono";
import { BookService } from "./book.service.js";
import { ApiResponse } from "../../../lib/api.response.js";
import { QueryBookDTO } from "./book.schema.js";

export class BookController {
    static async create(c: Context) {
        const body = c.get("body");
        const coverUrl = c.get("cover_url"); // jika upload middleware dipakai

        await BookService.create(body, coverUrl);

        return ApiResponse.sendSuccess(c, undefined, 201);
    }

    static async update(c: Context) {
        const id = c.req.param("id");
        const body = c.get("body");
        const coverUrl = c.get("cover_url");

        await BookService.update(id, body, coverUrl);

        return ApiResponse.sendSuccess(c, undefined, 200);
    }

    static async deleteMany(c: Context) {
        const body = await c.req.json<Array<{ id: string }>>();
        const ids = body.map((i) => i.id);

        const result = await BookService.softDeleteMany(ids);

        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async restoreMany(c: Context) {
        const body = await c.req.json<Array<{ id: string }>>();
        const ids = body.map((i) => i.id);

        const result = await BookService.restoreMany(ids);

        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async destroyMany(c: Context) {
        const body = await c.req.json<Array<{ id: string }>>();
        const ids = body.map((i) => i.id);

        const result = await BookService.destroyMany(ids);

        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async list(c: Context) {
        const q = c.req.query();

        const params: QueryBookDTO = {
            page: Number(q.page) || 1,
            take: Number(q.take) || 10,
            sortBy: (q.sortBy as QueryBookDTO["sortBy"]) || "updated_at",
            sortOrder: (q.sortOrder as QueryBookDTO["sortOrder"]) || "desc",
            search: q.search,

            category_slug: q.category_slug,
            author: q.author,
            publisher: q.publisher,
            publish_year: q.publish_year ? Number(q.publish_year) : undefined,
            language: q.language,
            pages: q.pages ? Number(q.pages) : undefined,
        };

        const result = await BookService.list(params);

        return ApiResponse.sendSuccess(c, result, 200, params);
    }

    static async detail(c: Context) {
        const id = c.req.param("id");

        const result = await BookService.detail(id);

        return ApiResponse.sendSuccess(c, result, 200);
    }
}
