import { Hono } from "hono";
import { UserRoutes } from "./user/user.routes.js";
import { AddressRoutes } from "./address/address.routes.js";
import { AccountController } from "./account.controller.js";

export const AccountRoutes = new Hono();
AccountRoutes.route("/users", UserRoutes);
AccountRoutes.route("/addresses", AddressRoutes);

AccountRoutes.get("/active-sessions", AccountController.getActiveSessions);
AccountRoutes.delete("/clear-sessions", AccountController.logoutAllDevices);
