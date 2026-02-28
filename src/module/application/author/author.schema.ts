import z from "zod";
import { ResponseBookSchema } from "../book/book.schema.js";

export const RequestAuthorSchema = z.object({
    first_name: z
        .string("Nama depan tidak boleh kosong")
        .max(150, "Nama depan maksimal 150 karakter"),
    last_name: z
        .string("Nama belakang tidak boleh kosong")
        .max(200, "Nama belakang maksimal 200 karakter")
        .nullable()
        .optional(),

    bio: z.string().max(500, "Bio maksimal memiliki 500 karakter").nullable().optional(),
});

export const ResponseAuthorSchema = RequestAuthorSchema.extend({
    id: z.number(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().nullable().optional(),
    books: z.array(ResponseBookSchema.omit({ authors: true, book_files: true })).optional(),
});

export type RequestAuthorDTO = z.input<typeof RequestAuthorSchema>;
export type ResponseAuthorDTO = z.output<typeof ResponseAuthorSchema>;

export type QueryAuthorDTO = {
    page: number;
    take: number;

    search?: string;
    status: "active" | "delete";
    sortOrder: "asc" | "desc";
    sortBy: "first_name" | "last_name" | "updated_at";
};
