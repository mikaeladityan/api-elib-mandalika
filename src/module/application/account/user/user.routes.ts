import { validateBody } from "../../../../middleware/validation.js";
import { Hono } from "hono";
import { UserSchema } from "./user.schema.js";
import { UserController } from "./user.controller.js";

const UserRoutes = new Hono();

UserRoutes.put("/", validateBody(UserSchema), UserController.upsert);
UserRoutes.patch("/", UserController.changePhoto);

export { UserRoutes };
