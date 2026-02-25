import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    S3ServiceException,
    ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

interface UploadResponse {
    key: string;
    url: string;
}

class S3Service {
    private client: S3Client;
    private bucket: string;

    constructor() {
        this.bucket = env.S3_BUCKET_NAME;
        this.client = new S3Client({
            region: env.S3_REGION,
            endpoint: env.S3_ENDPOINT,
            credentials: {
                accessKeyId: env.S3_ACCESS_KEY,
                secretAccessKey: env.S3_SECRET_KEY,
            },
            forcePathStyle: true,
        });
    }

    private createKey(fileName: string, folderPath: string, userId?: string): string {
        const parts = [folderPath, userId, fileName].filter(Boolean);
        return parts.join("/").replace(/\/+/g, "/");
    }

    async upload(
        fileBuffer: Buffer | Uint8Array,
        fileName: string,
        mimeType: string,
        folderPath = "",
        userId?: string,
    ): Promise<UploadResponse> {
        const key = this.createKey(fileName, `${env.S3_FOLDERPATH}/${folderPath}`, userId);

        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: mimeType,
                    ACL: "public-read" as ObjectCannedACL,
                }),
            );

            const baseUrl = env.S3_ENDPOINT.endsWith("/") ? env.S3_ENDPOINT : `${env.S3_ENDPOINT}/`;
            const url = `${baseUrl}${this.bucket}/${encodeURIComponent(key)}`;

            return { key, url };
        } catch (error) {
            console.error("[S3_UPLOAD_ERROR]:", error);
            throw new Error("Gagal mengunggah file ke storage.");
        }
    }

    async deleteByUrl(fileUrl: string): Promise<void> {
        try {
            const endpoint = env.S3_ENDPOINT.replace(/\/$/, "");
            const basePrefix = `${endpoint}/${this.bucket}/`;

            if (!fileUrl.startsWith(basePrefix)) {
                console.warn("[S3_DELETE_WARNING]: Format URL tidak valid, skip.");
                return;
            }

            let key = fileUrl.replace(basePrefix, "").split("?")[0];
            key = decodeURIComponent(String(key));

            await this.deleteByKey(key);
        } catch (error) {
            console.error("[S3_DELETE_URL_ERROR]:", error);
            throw error;
        }
    }

    async deleteByKey(key: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
        } catch (error) {
            if (
                error instanceof S3ServiceException &&
                (error as any).$metadata?.httpStatusCode === 404
            ) {
                console.info(
                    `[S3_DELETE_INFO]: File ${key} tidak ditemukan, anggap sudah terhapus.`,
                );
                return;
            }
            console.error("[S3_DELETE_KEY_ERROR]:", error);
            throw error;
        }
    }
}

export const s3Service = new S3Service();
