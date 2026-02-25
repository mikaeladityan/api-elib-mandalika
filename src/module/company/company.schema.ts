import { z } from "zod";

export const RequestCompanySchema = z.object({
    name: z
        .string({
            error: "Nama perusahaan wajib diisi",
        })
        .min(2, "Nama perusahaan minimal 2 karakter")
        .max(100, "Nama perusahaan maksimal 100 karakter"),

    legal_name: z
        .string({
            error: "Nama legal perusahaan harus berupa teks",
        })
        .max(100, "Nama legal perusahaan maksimal 100 karakter")
        .nullable(),
    description: z
        .string({
            error: "Deskripsi perusahaan harus berupa teks",
        })
        .max(200)
        .nullable(),

    logo: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z
            .string({
                error: () => ({ message: "Logo harus berupa URL atau path file" }),
            })
            .url("Format logo harus berupa URL yang valid")
            .optional()
            .nullable(),
    ),

    established_at: z.coerce.date({
        error: "Tanggal pendirian wajib diisi",
    }),
});

export const ResponseCompanySchema = RequestCompanySchema.extend({
    id: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
});

export type RequestCompanyDTO = z.infer<typeof RequestCompanySchema>;
export type ResponseCompanyDTO = z.output<typeof ResponseCompanySchema>;
