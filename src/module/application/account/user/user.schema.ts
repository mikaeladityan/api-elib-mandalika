import z from "zod";

export const UserSchema = z.object({
    first_name: z.string("Nama depan tidak boleh kosong").max(100),
    last_name: z.string("Nama belakang tidak valid").max(100).optional(),
    photo: z.string("Foto tidak valid").optional(),
    phone: z
        .string("No. HP tidak valid")
        .regex(/^\d+$/, "No. HP harus berupa string angka saja.")
        .max(20, "No. HP tidak valid")
        .optional(),
    whatsapp: z
        .string("No. Whatsapp tidak valid")
        .regex(/^\d+$/, "No. Whatsapp harus berupa string angka saja.")
        .max(20, "No. Whatsapp tidak valid")
        .optional(),
});

export const ResponseUserSchema = UserSchema.extend({
    id: z.string("Id tidak boleh kosong"),
    created_at: z.date(),
    updated_at: z.date(),
});

export type RequestUserDTO = z.infer<typeof UserSchema>;
export type ResponseUserDTO = z.infer<typeof ResponseUserSchema>;
