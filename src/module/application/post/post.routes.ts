import { Hono } from "hono";
import { validateBody } from "../../../middleware/validation.js";
import { RequestPostSchema, RequestCommentSchema } from "./post.schema.js";
import { PostController } from "./post.controller.js";

export const PostRoutes = new Hono();

// POSTS
PostRoutes.put("/:id", validateBody(RequestPostSchema.partial()), PostController.update);
PostRoutes.patch("/:id/restore", PostController.restore);
PostRoutes.delete("/:id/destroy", PostController.destroy);
PostRoutes.delete("/:id", PostController.softDelete);

PostRoutes.post("/", validateBody(RequestPostSchema), PostController.create);
PostRoutes.get("/", PostController.list);
PostRoutes.get("/:id", PostController.detail);

// COMMENTS
// Using /:id/comments sub-route pattern for a specific post
PostRoutes.get("/:id/comments", PostController.listComments);
PostRoutes.post("/:id/comments", validateBody(RequestCommentSchema), PostController.createComment);
// This one is unique to comments, assuming an isolated commentId
PostRoutes.delete("/comments/:commentId", PostController.deleteComment);
