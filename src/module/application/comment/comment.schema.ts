import z from "zod";
import { STATUS } from "../../../generated/prisma/enums.js";

export const QueryGlobalCommentSchema = z.object({
    page: z.number().default(1),
    take: z.number().default(10),
    search: z.string().optional(),
    status: z.enum(["active", "delete"]).default("active"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type QueryGlobalCommentDTO = z.infer<typeof QueryGlobalCommentSchema>;
