import { authMiddleware } from "../../middleware/auth.js";
import { Hono } from "hono";
import { AccountRoutes } from "./account/account.routes.js";
import { LogRoutes } from "./log/log.routes.js";
import { AuthorRoutes } from "./author/author.routes.js";
import { BookRoutes } from "./book/book.routes.js";

export const ApplicationRoutes = new Hono().use(authMiddleware);
ApplicationRoutes.route("/accounts", AccountRoutes);
ApplicationRoutes.route("/logs", LogRoutes);
ApplicationRoutes.route("/authors", AuthorRoutes);
ApplicationRoutes.route("/books", BookRoutes);
