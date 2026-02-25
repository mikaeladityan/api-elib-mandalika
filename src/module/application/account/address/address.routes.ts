import { validateBody } from "../../../../middleware/validation.js";
import { Hono } from "hono";
import { AddressSchema } from "./address.schema.js";
import { AddressController } from "./address.controller.js";

export const AddressRoutes = new Hono();
AddressRoutes.get("/province", AddressController.province);
AddressRoutes.get("/city", AddressController.city);
AddressRoutes.get("/district", AddressController.district);
AddressRoutes.get("/subdistrict", AddressController.subdistrict);

AddressRoutes.patch("/:id", AddressController.changePrimary);
AddressRoutes.put("/:id", validateBody(AddressSchema), AddressController.update);
AddressRoutes.get("/:id", AddressController.detail);
AddressRoutes.delete("/:id", AddressController.deleted);

AddressRoutes.get("/", AddressController.list);
AddressRoutes.post("/", validateBody(AddressSchema), AddressController.create);
