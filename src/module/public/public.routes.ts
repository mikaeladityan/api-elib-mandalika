import { Hono } from "hono";
import { PublicController } from "./public.controller.js";

export const PublicRoutes = new Hono();
// Options
PublicRoutes.get("/options", PublicController.getOptions);

// Home
PublicRoutes.get("/home", PublicController.home);

// Books
PublicRoutes.get("/books/:slug", PublicController.getBookDetail);
PublicRoutes.get("/books", PublicController.getBooks);

// Posts
PublicRoutes.get("/posts/:id/comments", PublicController.getPostComments);
PublicRoutes.get("/posts/:id", PublicController.getPostDetail);
PublicRoutes.get("/posts", PublicController.getPosts);
