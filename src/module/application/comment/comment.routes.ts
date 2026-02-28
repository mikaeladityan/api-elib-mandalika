import { Hono } from "hono";
import { CommentController } from "./comment.controller.js";

export const CommentRoutes = new Hono();

CommentRoutes.get("/", CommentController.list);
