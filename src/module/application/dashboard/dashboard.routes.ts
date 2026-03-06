import { Hono } from "hono";
import { DashboardController } from "./dashboard.controller.js";

export const DashboardRoutes = new Hono();

DashboardRoutes.get("/stats", DashboardController.getStats);
