// import type { Context } from "hono";
// import { ApiError } from "./errors/api.error.js";
// import { s3Service } from "./s3.js";
// import * as crypto from "crypto";

// interface MultiUploadOptions {
//     fieldName: string;
//     maxSize?: number;
//     allowedExtensions?: string[];
//     allowedTypes?: string[];
//     folderPath?: string;
// }

// export async function handleMultipleFileUpload(
//     c: Context,
//     options: MultiUploadOptions,
// ): Promise<
//     {
//         file_url: string;
//         file_type: string;
//         size_kb: number;
//     }[]
// > {
//     const {
//         fieldName,
//         maxSize = 20 * 1024 * 1024,
//         allowedExtensions = [".pdf", ".epub"],
//         allowedTypes = ["application/pdf", "application/epub+zip"],
//         folderPath = "book/files",
//     } = options;

//     const body = await c.req.parseBody();

//     let files = body[fieldName];

//     if (!files) return [];

//     const fileArray: File[] = Array.isArray(files)
//         ? files.filter((f): f is File => f instanceof File)
//         : files instanceof File
//           ? [files]
//           : [];

//     if (!fileArray.length) {
//         throw new ApiError(400, "No valid files uploaded");
//     }

//     const results = await Promise.all(
//         fileArray.map(async (file) => {
//             const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

//             if (!allowedExtensions.includes(ext)) {
//                 throw new ApiError(400, `Ekstensi ${ext} tidak diizinkan`);
//             }

//             if (!allowedTypes.includes(file.type)) {
//                 throw new ApiError(400, `Tipe ${file.type} tidak didukung`);
//             }

//             if (file.size > maxSize) {
//                 throw new ApiError(400, "Ukuran file terlalu besar");
//             }

//             const buffer = Buffer.from(await file.arrayBuffer());

//             const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

//             const upload = await s3Service.upload(buffer, fileName, file.type, folderPath);

//             return {
//                 file_url: upload.url,
//                 file_type: ext.replace(".", "").toUpperCase(),
//                 size_kb: Math.round(file.size / 1024),
//             };
//         }),
//     );

//     return results;
// }
