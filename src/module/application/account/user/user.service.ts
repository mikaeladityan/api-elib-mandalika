import prisma from "../../../../config/prisma.js";
import { RequestUserDTO } from "./user.schema.js";
import { ApiError } from "../../../../lib/errors/api.error.js";
import { Account, User } from ".././../../../generated/prisma/client.js";
import { s3Service } from "../../../../lib/s3.js";

export class UserService {
    private static async findAccount(email: string): Promise<Account | null> {
        return await prisma.account.findUnique({
            where: {
                email,
            },
        });
    }

    static async upsert(email: string, body: RequestUserDTO): Promise<User> {
        const account = await this.findAccount(email);
        if (!account) throw new ApiError(404, "Akun anda tidak ditemukan");

        return await prisma.user.upsert({
            where: {
                account_id: account.id,
            },
            create: {
                account_id: account.id,
                ...body,
            },
            update: {
                ...body,
                updated_at: new Date(),
            },
        });
    }

    static async photo(id: string, newPhotoUrl: string) {
        const user = await prisma.user.findUnique({
            where: {
                account_id: id,
            },
            select: {
                photo: true,
            },
        });

        if (!user) throw new ApiError(404, "Anda belum mengatur profile lengkap anda");

        // Hapus foto lama jika ada
        if (user?.photo) {
            await s3Service.deleteByUrl(user.photo);
        }

        // Update database
        await prisma.user.update({
            where: { account_id: id },

            data: { photo: newPhotoUrl },
        });
    }
}
