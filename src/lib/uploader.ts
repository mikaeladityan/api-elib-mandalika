import type { Context } from "hono";
import * as crypto from "crypto";
import sharp from "sharp";
import { ApiError } from "./errors/api.error.js";
import { s3Service } from "./s3.js";

interface UploadOptions {
    fieldName?: string;
    allowedExtensions?: string[];
    allowedTypes?: string[];
    maxSize?: number; // dalam Bytes
    folderPath?: string;
    userId?: string;
    customFileName?: string;
    convertToWebp?: boolean; // Opsi tambahan untuk kontrol konversi
}

/**
 * Handler untuk memproses upload file dari Hono Context
 * Mendukung auto-convert image ke WebP dan validasi ketat.
 */
export async function handleFileUpload(c: Context, options: UploadOptions = {}): Promise<string> {
    const {
        fieldName = "file",
        allowedExtensions = [".jpg", ".jpeg", ".webp", ".png", ".pdf", ".doc", ".docx", ".csv"],
        allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/csv",
            "application/vnd.ms-excel",
        ],
        maxSize = 10 * 1024 * 1024,
        folderPath = "uploads",
        userId,
        customFileName,
        convertToWebp = true, // Default aktif
    } = options;

    // 1. Ambil File dari FormData (Hono parseBody menangani multipart)
    const formData = await c.req.parseBody();
    const file = formData[fieldName];

    // Validasi dasar keberadaan file
    if (!file || !(file instanceof File) || file.size === 0) {
        throw new ApiError(400, `File tidak ditemukan pada field: '${fieldName}'`);
    }

    // 2. Identifikasi File & Validasi Awal
    const originalName = file.name;
    const extension = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();

    // Cek apakah file termasuk kategori image yang didukung untuk konversi
    const supportedImageMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const isImage = supportedImageMimes.includes(file.type);

    // Validasi Ekstensi & MIME
    if (!allowedExtensions.includes(extension)) {
        throw new ApiError(400, `Ekstensi ${extension} tidak diizinkan.`);
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        throw new ApiError(400, `Tipe MIME ${file.type} tidak didukung.`);
    }

    // Validasi Ukuran
    if (file.size > maxSize) {
        throw new ApiError(
            400,
            `File terlalu besar. Maksimal ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
        );
    }

    try {
        // 3. Persiapan Buffer & Nama File
        let buffer = Buffer.from(await file.arrayBuffer());
        let finalMimeType = file.type;
        let finalExtension = extension;

        // 4. Logika Konversi WebP (Hanya jika file adalah gambar)
        if (isImage && convertToWebp) {
            buffer = Buffer.from(
                await sharp(buffer)
                    .webp({ quality: 80 }) // Kompresi lossy yang efisien
                    .toBuffer(),
            );

            finalMimeType = "image/webp";
            finalExtension = ".webp";
        }

        // 5. Penamaan File yang Aman
        let fileName: string;
        if (customFileName) {
            // Bersihkan nama dari karakter aneh
            const sanitized = customFileName.replace(/[^a-zA-Z0-9_-]/g, "_");
            fileName = `${sanitized}${finalExtension}`;
        } else {
            const randomHash = crypto.randomBytes(12).toString("hex");
            fileName = `${Date.now()}-${randomHash}${finalExtension}`;
        }

        // 6. Eksekusi Upload ke S3
        const result = await s3Service.upload(buffer, fileName, finalMimeType, folderPath, userId);

        return result.url;
    } catch (error) {
        if (error instanceof ApiError) throw error;

        // Tangani error khusus dari Sharp (misal gambar corrupt)
        if (error instanceof Error && error.message.includes("Vips")) {
            throw new ApiError(400, "File gambar rusak atau tidak valid.");
        }

        console.error("[UPLOAD_HANDLER_FATAL]:", error);
        throw new ApiError(500, "Gagal memproses dan mengunggah file.");
    }
}
