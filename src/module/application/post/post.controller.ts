import { Context } from "hono";
import { PostService } from "./post.service.js";
import { ApiResponse } from "../../../lib/api.response.js";
import { QueryPostDTO, QueryCommentDTO } from "./post.schema.js";

export class PostController {
    // ================== POST METHODS ==================
    static async create(c: Context) {
        const body = c.get("body");
        const result = await PostService.create(body);
        return ApiResponse.sendSuccess(c, result, 201);
    }

    static async update(c: Context) {
        const id = c.req.param("id");
        const body = c.get("body");
        const result = await PostService.update(id, body);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async softDelete(c: Context) {
        const id = c.req.param("id");
        const result = await PostService.softDelete(id);
        return ApiResponse.sendSuccess(c, result, 200, "Status berhasil dibuang");
    }

    static async restore(c: Context) {
        const id = c.req.param("id");
        const result = await PostService.restore(id);
        return ApiResponse.sendSuccess(c, result, 200, "Status berhasil dipulihkan");
    }

    static async destroy(c: Context) {
        const id = c.req.param("id");
        await PostService.destroy(id);
        return ApiResponse.sendSuccess(c, null, 200, "Status dihapus permanen");
    }

    static async list(c: Context) {
        const query = c.req.query() as unknown;
        const result = await PostService.list(query as QueryPostDTO);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async detail(c: Context) {
        const id = c.req.param("id");
        const result = await PostService.detail(id);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    // ================== COMMENT METHODS ==================
    static async listComments(c: Context) {
        const postId = c.req.param("id");
        const query = c.req.query() as unknown;
        const result = await PostService.listComments(postId, query as QueryCommentDTO);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async createComment(c: Context) {
        const postId = c.req.param("id");
        const body = c.get("body");
        const result = await PostService.createComment(postId, body);
        return ApiResponse.sendSuccess(c, result, 201, "Komentar berhasil dikirim");
    }

    static async deleteComment(c: Context) {
        const commentId = c.req.param("commentId");
        await PostService.deleteComment(commentId);
        return ApiResponse.sendSuccess(c, null, 200, "Komentar dihapus");
    }
}
