import z from "zod";
import { FILE_TYPE, STATUS } from "../../../generated/prisma/enums.js";

export const RequestPublisherSchema = z.object({
    id: z.number().optional().nullable(),
    name: z.string(),
});

export const RequestCategorySchema = z.object({
    name: z.string(),
});

export const RequestBookFile = z.object({
    file_url: z.string(),
    file_type: z.enum(FILE_TYPE),
    size_kb: z.number(),
    pages: z.number(),
});
export const RequestBookSchema = z.object({
    title: z.string("Judul buku tidak boleh kosong").max(200, "Judul buku maksimal 200 karakter"),
    description: z.string().max(500).optional(),
    status: z.enum(STATUS).default("ACTIVE"),
    cover_url: z.string().optional(),
    isbn: z.string().optional(),
    publish_year: z.number().optional(),
    language: z.string().optional(),
    pages: z.number().default(1).nullable(),
    authors: z.array(
        z.object({
            author_id: z.number(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional(),
            bio: z.string().nullable().optional(),
        }),
    ),
    categories: z.array(RequestCategorySchema),
    publisher: RequestPublisherSchema,
    book_files: z.array(RequestBookFile),
});
export const ResponseBookSchema = RequestBookSchema.extend({
    id: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().optional(),
});

export type RequestBookDTO = z.input<typeof RequestBookSchema>;
export type ResponseBookDTO = z.input<typeof ResponseBookSchema>;

export type QueryBookDTO = {
    page: number;
    take: number;

    search?: string;

    sortOrder: "asc" | "desc";
    sortBy: "title" | "" | "updated_at" | "publish_year";
    category_slug?: string;
    author?: string;
    publisher?: string;
    publish_year?: number;
    language?: string;
    pages?: number;
};
