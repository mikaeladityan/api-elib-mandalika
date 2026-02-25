import { Hono } from "hono";
import { LogController } from "./log.controller.js";

export const LogRoutes = new Hono();
LogRoutes.get("/", LogController.list);
