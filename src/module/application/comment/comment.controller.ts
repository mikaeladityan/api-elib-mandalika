import { Context } from "hono";
import { CommentService } from "./comment.service.js";
import { ApiResponse } from "../../../lib/api.response.js";
import { QueryGlobalCommentDTO } from "./comment.schema.js";

export class CommentController {
    static async list(c: Context) {
        const query = c.req.query() as unknown as QueryGlobalCommentDTO;
        const result = await CommentService.list(query);
        return ApiResponse.sendSuccess(c, result, 200);
    }
}
