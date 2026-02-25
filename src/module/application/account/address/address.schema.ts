import z from "zod";

export const AddressSchema = z.object({
    name: z
        .string("Nama alamat tidak boleh kosong")
        .max(100, "Nama alamat tidak boleh lebih 100 karakter"),
    primary: z.boolean().nullable().default(false),
    street: z
        .string("Jalan tidak boleh kosong")
        .max(200, "Jalan tidak boleh lebih dari 200 karakter"),
    district: z.string("Kecamatan tidak boleh kosong"),
    sub_district: z.string("Kelurahan tidak boleh kosong"),
    city: z.string("Kota tidak boleh kosong"),
    province: z.string("Provinsi tidak boleh kosong"),
    country: z.string().max(100).optional().default("Indonesia"),
    postal_code: z.string().max(6, "Kode Pos tidak boleh lebih dari 6 karakter"),
    notes: z.string().max(200, "Catatan tidak boleh lebih dari 200 karakter").nullable().optional(),
});

export const ResponseAddressSchema = AddressSchema.extend({
    id: z.int(),
    created_at: z.date(),
    updated_at: z.date(),
});

export type RequestAddressDTO = z.infer<typeof AddressSchema>;
export type ResponseAddressDTO = z.infer<typeof ResponseAddressSchema>;
