import { ROLE, STATUS } from "../../../generated/prisma/enums.js";
import z from "zod";
import { ResponseUserSchema } from "./user/user.schema.js";
const EmailSchema = z
    .string({ error: "Email wajib diisi" })
    .max(100, { message: "Panjang email maksimal 100 karakter" })
    .email({ message: "Format email tidak valid" })
    .transform((m) => m.toLowerCase());

const AccountSchema = z.object({
    email: EmailSchema,
    status: z.enum(STATUS).default("ACTIVE"),
    role: z.enum(ROLE).default("STAFF"),
});

export const ResponseAccountSchema = AccountSchema.extend({
    user: ResponseUserSchema.optional(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().optional(),
});

export type ResponseAccountDTO = z.infer<typeof ResponseAccountSchema>;
