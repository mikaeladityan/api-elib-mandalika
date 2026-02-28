import { Hono } from "hono";
import { validateBody } from "../../../middleware/validation.js";
import { RequestBookSchema } from "./book.schema.js";
import { BookController } from "./book.controller.js";

export const BookRoutes = new Hono();

BookRoutes.patch("/:id/restore", BookController.restore);
BookRoutes.delete("/:id/destroy", BookController.destroy);
BookRoutes.get("/options", BookController.getOptions);

BookRoutes.put("/:id", validateBody(RequestBookSchema.partial()), BookController.update);
BookRoutes.post("/", validateBody(RequestBookSchema), BookController.create);
BookRoutes.delete("/:id", BookController.softDelete);

BookRoutes.post("/:id/file", BookController.addBookFile);
BookRoutes.delete("/:id/file/:fileId", BookController.deleteBookFile);

BookRoutes.get("/:id", BookController.detail);
BookRoutes.get("/", BookController.list);
