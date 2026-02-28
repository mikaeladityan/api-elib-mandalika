import { ApiError } from "../lib/errors/api.error.js";
import type { Context, Next } from "hono";
import { z } from "zod";

// Middleware untuk validasi umum (query + body)
export const validate = (schema: z.ZodSchema) => async (c: Context, next: Next) => {
    try {
        const data = {
            ...c.req.query(),
            ...(await c.req.parseBody().catch(() => ({}))), // Gunakan parseBody untuk form data
        };

        schema.parse(data);
        await next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map((issue) => ({
                message: issue.message,
                path: issue.path.join("."),
            }));
            throw new ApiError(400, "Validation error", errors); // Lempar ApiError
        }
        throw error; // Lempar error asli untuk ditangkap handler
    }
};

// Middleware untuk validasi body JSON
export const validateBody =
    <T extends z.ZodTypeAny>(schema: T) =>
    async (c: Context, next: Next) => {
        try {
            const contentType = c.req.header("content-type") || "";

            let parsedBody: any;

            // ✅ jika multipart/form-data
            if (contentType.includes("multipart/form-data")) {
                const form = await c.req.parseBody();

                if (!form.data) {
                    throw new ApiError(400, "Field 'data' tidak ditemukan");
                }
                console.log(form);
                parsedBody = JSON.parse(form.data as string);
            }
            // ✅ jika application/json
            else {
                parsedBody = await c.req.json();
            }

            console.log(parsedBody);
            const validated = schema.parse(parsedBody);

            c.set("body", validated);

            await next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.issues.map((issue) => ({
                    message: issue.message,
                    path: issue.path.join("."),
                }));
                throw new ApiError(400, "Validation Error", errors);
            }

            throw error;
        }
    };
