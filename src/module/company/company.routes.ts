import { Hono } from "hono";
import { authMiddleware, roleMiddleware } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validation.js";
import { RequestCompanySchema } from "./company.schema.js";
import { CompanyController } from "./company.controller.js";
import { CompanyMiddleware } from "../../middleware/company.js";

export const CompanyRoutes = new Hono();
CompanyRoutes.use(CompanyMiddleware);

CompanyRoutes.post(
    "/",
    authMiddleware,
    roleMiddleware(["DEVELOPER", "OWNER"]),
    validateBody(RequestCompanySchema),
    CompanyController.upsert,
);
CompanyRoutes.patch(
    "/",
    authMiddleware,
    roleMiddleware(["DEVELOPER", "OWNER"]),
    CompanyController.changeLogo,
);
CompanyRoutes.get("/", CompanyController.get);
