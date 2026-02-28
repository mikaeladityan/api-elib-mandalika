import z from "zod";
import { STATUS } from "../../../generated/prisma/enums.js";

// ----- POST -----
export const RequestPostSchema = z.object({
    content: z.string().min(1, "Konten tidak boleh kosong"),
    status: z.enum(STATUS).default("ACTIVE"),
});

export const ResponsePostSchema = RequestPostSchema.extend({
    id: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().optional().nullable(),
    _count: z
        .object({
            comments: z.number(),
        })
        .optional(),
});

export type RequestPostDTO = z.infer<typeof RequestPostSchema>;
export type ResponsePostDTO = z.input<typeof ResponsePostSchema>;

export type QueryPostDTO = {
    page: number;
    take: number;
    search?: string;
    status: "active" | "delete";
    sortOrder: "asc" | "desc";
    sortBy: "created_at" | "updated_at";
};

// ----- COMMENT -----
export const RequestCommentSchema = z.object({
    name: z.string().min(1, "Nama tidak boleh kosong").max(100, "Nama terlalu panjang"),
    content: z
        .string()
        .min(1, "Komentar tidak boleh kosong")
        .max(200, "Komentar maksimal 200 karakter"),
    parent_id: z.string().optional().nullable(),
});

export const ResponseCommentSchema = RequestCommentSchema.extend({
    id: z.string(),
    post_id: z.string(),
    status: z.enum(STATUS),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().optional().nullable(),
    replies: z.array(z.any()).optional().default([]), // For nesting replies
});

export type RequestCommentDTO = z.infer<typeof RequestCommentSchema>;
export type ResponseCommentDTO = z.input<typeof ResponseCommentSchema>;

export type QueryCommentDTO = {
    page: number;
    take: number;
    sortOrder: "asc" | "desc";
    search?: string;
};
