import { Context } from "hono";
import { BookService } from "../application/book/book.service.js";
import { PostService } from "../application/post/post.service.js";
import { ApiResponse } from "../../lib/api.response.js";
import { QueryBookDTO } from "../application/book/book.schema.js";
import { QueryPostDTO, QueryCommentDTO } from "../application/post/post.schema.js";

export class PublicController {
    static async home(c: Context) {
        // Fetch 5 latest books & 5 latest posts
        const [books, posts] = await Promise.all([
            BookService.list({
                page: 1,
                take: 10,
                status: "active",
                sortBy: "updated_at",
                sortOrder: "desc",
            }),
            PostService.list({
                page: 1,
                take: 5,
                status: "active",
                sortBy: "created_at",
                sortOrder: "desc",
            }),
        ]);

        return ApiResponse.sendSuccess(
            c,
            {
                books: books.data,
                posts: posts.data,
            },
            200,
            "Home data retrieved",
        );
    }

    // BOOKS
    static async getBooks(c: Context) {
        const q = c.req.query();
        const params: QueryBookDTO = {
            page: Number(q.page) || 1,
            take: Number(q.take) || 10,
            sortBy: (q.sortBy as QueryBookDTO["sortBy"]) || "updated_at",
            sortOrder: (q.sortOrder as QueryBookDTO["sortOrder"]) || "desc",
            search: q.search,
            status: "active", // Always active for public
            category_slug: q.category_slug,
            author: q.author,
            publisher: q.publisher,
            publish_year: q.publish_year ? Number(q.publish_year) : undefined,
            language: q.language,
            pages: q.pages ? Number(q.pages) : undefined,
        };
        const result = await BookService.list(params);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async getBookDetail(c: Context) {
        const slug = c.req.param("slug");
        const result = await BookService.detail(slug);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    // POSTS
    static async getPosts(c: Context) {
        const q = c.req.query();
        const params: QueryPostDTO = {
            page: Number(q.page) || 1,
            take: Number(q.take) || 10,
            sortBy: (q.sortBy as QueryPostDTO["sortBy"]) || "created_at",
            sortOrder: (q.sortOrder as QueryPostDTO["sortOrder"]) || "desc",
            search: q.search,
            status: "active", // Always active for public
        };
        const result = await PostService.list(params);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async getPostDetail(c: Context) {
        const id = c.req.param("id");
        const result = await PostService.detail(id);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async getPostComments(c: Context) {
        const postId = c.req.param("id");
        const query = c.req.query() as unknown;
        const result = await PostService.listComments(postId, query as QueryCommentDTO);
        return ApiResponse.sendSuccess(c, result, 200);
    }

    static async getOptions(c: Context) {
        const rest = await BookService.getOptions();
        return ApiResponse.sendSuccess(c, rest, 200);
    }
}
