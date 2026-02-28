import { Context } from "hono";
import { BookService } from "./book.service.js";
import { ApiResponse } from "../../../lib/api.response.js";
import { QueryBookDTO } from "./book.schema.js";
import { handleFileUpload } from "../../../lib/uploader.js";

export class BookController {
    static async create(c: Context) {
        const body = c.get("body");
        const coverUrl = await handleFileUpload(c, {
            fieldName: "cover",
            folderPath: "book/",
            maxSize: 5 * 1024 * 1024,
            allowedExtensions: [".webp", ".jpeg", ".jpg", ".png"],
        });

        const result = await BookService.create(body, coverUrl);

        return ApiResponse.sendSuccess(c, result, 201);
    }

    static async update(c: Context) {
        const id = c.req.param("id");
        const body = c.get("body");
        const coverUrl = c.get("cover_url");

        const result = await BookService.update(id, body, coverUrl);

        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async softDelete(c: Context) {
        const id = c.req.param("id");

        const result = await BookService.softDelete(id);

        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async restore(c: Context) {
        const id = c.req.param("id");

        const result = await BookService.restore(id);

        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async destroy(c: Context) {
        const id = c.req.param("id");

        const result = await BookService.destroy(id);

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
            status: (q.status as QueryBookDTO["status"]) || "active",
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

    static async getOptions(c: Context) {
        const rest = await BookService.getOptions();
        return ApiResponse.sendSuccess(c, rest, 200);
    }

    static async addBookFile(c: Context) {
        const id = c.req.param("id");

        // Ensure size limit and reasonable settings for files
        const fileUrl = await handleFileUpload(c, {
            fieldName: "book_file",
            folderPath: "book-assets/",
            maxSize: 50 * 1024 * 1024, // 50MB max limit
            allowedExtensions: [".pdf", ".epub"],
            allowedTypes: ["application/pdf", "application/epub+zip"],
            convertToWebp: false,
        });

        // We need to parse body again because handleFileUpload consumes it but maybe we need some other fields if sent.
        // If not sent we construct from uploaded file metadata manually
        const formData = await c.req.parseBody();
        const file = formData["book_file"] as File;

        // Estimate pages or get other data? For now we can extract sizes
        const sizeKb = Math.round(file.size / 1024);
        const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        const file_type = extension === ".pdf" ? "PDF" : "EPUB";

        const body = {
            file_url: fileUrl,
            file_type: file_type,
            size_kb: sizeKb,
            pages: 0, // Need accurate page count or leave 0 for now since it's required by DTO
        };

        const result = await BookService.addBookFile(id, body as any);

        return ApiResponse.sendSuccess(c, result, 201);
    }

    static async deleteBookFile(c: Context) {
        const id = c.req.param("id");
        const fileId = c.req.param("fileId");

        const result = await BookService.deleteBookFile(fileId, id);

        return ApiResponse.sendSuccess(c, result, 200);
    }
}
