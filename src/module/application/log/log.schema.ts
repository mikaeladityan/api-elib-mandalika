import { LogActivities } from "../../../generated/prisma/enums.js";
import z from "zod";

export const LoggingActivitySchema = z.object({
    account_id: z.string(),
    activity: z.enum(LogActivities),
    resource: z.string().optional().nullable(),
    description: z.string(),
});

export const ResponseLoggingActivitySchema = LoggingActivitySchema.extend({
    id: z.number(),
    email: z.email(),
    created_at: z.date(),
});

export const QueryLoggingActivitySchema = z.object({
    search: z.string().optional(),
    log_activity: z.enum(LogActivities).optional(),

    page: z.number().int().positive().default(1).optional(),
    take: z.number().int().positive().max(100).default(10).optional(),

    sortBy: z
        .enum(["log_activity", "account_id", "updated_at", "created_at"])
        .default("updated_at"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateLoggingActivityDTO = z.input<typeof LoggingActivitySchema>;
export type ResponseLoggingActivityDTO = z.output<typeof ResponseLoggingActivitySchema>;
export type QueryLoggingActivityDTO = z.infer<typeof QueryLoggingActivitySchema>;
