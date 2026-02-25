import { Hono } from "hono";
import { validateBody } from "../../../middleware/validation.js";
import { RequestAuthorSchema } from "./author.schema.js";
import { AuthorController } from "./author.controller.js";

export const AuthorRoutes = new Hono();
AuthorRoutes.patch("/restore", AuthorController.restoreMany);
AuthorRoutes.delete("/destroy", AuthorController.destroyMany);
AuthorRoutes.delete("/delete", AuthorController.deleteMany);

AuthorRoutes.put("/:id", validateBody(RequestAuthorSchema.partial()), AuthorController.update);
AuthorRoutes.get("/:id", AuthorController.detail);

AuthorRoutes.post("/", validateBody(RequestAuthorSchema), AuthorController.create);
AuthorRoutes.get("/", AuthorController.list);
