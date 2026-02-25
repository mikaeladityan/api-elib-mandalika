import { Hono } from "hono";
import { validateBody } from "../../../middleware/validation.js";
import { RequestBookSchema } from "./book.schema.js";
import { BookController } from "./book.controller.js";

export const BookRoutes = new Hono();

BookRoutes.patch("/restore", BookController.restoreMany);
BookRoutes.delete("/destroy", BookController.destroyMany);

BookRoutes.put("/:id", validateBody(RequestBookSchema.partial()), BookController.update);
BookRoutes.post("/", validateBody(RequestBookSchema), BookController.create);
BookRoutes.delete("/", BookController.deleteMany);

BookRoutes.get("/:id", BookController.detail);
BookRoutes.get("/", BookController.list);
