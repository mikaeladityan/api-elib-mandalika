import { Hono } from "hono";
import { AuthRoutes } from "./auth/auth.routes.js";
import { ApplicationRoutes } from "./application/application.routes.js";
import { CompanyRoutes } from "./company/company.routes.js";
import { PublicRoutes } from "./public/public.routes.js";

export const routes = new Hono();
routes.route("/auth", AuthRoutes);
routes.route("/app", ApplicationRoutes);
routes.route("/companies", CompanyRoutes);
routes.route("/public", PublicRoutes);
