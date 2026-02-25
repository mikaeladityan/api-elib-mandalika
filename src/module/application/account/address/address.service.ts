import { Account, Address, Prisma } from "../../../../generated/prisma/client.js";
import { RequestAddressDTO, ResponseAddressDTO } from "./address.schema.js";
import prisma from "../../../../config/prisma.js";
import { ApiError } from "../../../../lib/errors/api.error.js";

export class AddressService {
    static async create(account_id: string, body: RequestAddressDTO): Promise<Address | undefined> {
        const countAddress = await prisma.address.count();
        if (countAddress > 3) throw new ApiError(400, "Alamat anda tidak boleh lebih dari 3");

        const res = await prisma.$transaction(async (tx) => {
            if (body.primary) {
                await tx.address.updateMany({
                    where: {
                        account_id,
                        primary: true,
                    },
                    data: {
                        primary: false,
                    },
                });
            }

            return tx.address.create({
                data: {
                    ...body,
                    account_id,
                },
            });
        });

        if (res.primary === true) {
            return res;
        }
    }

    static async update(
        account_id: string,
        body: RequestAddressDTO,
        address_id: number,
    ): Promise<Address | undefined> {
        const res = await prisma.$transaction(async (tx) => {
            const address = await tx.address.findUnique({
                where: {
                    id: address_id,
                    account_id,
                },
            });

            if (!address) {
                throw new ApiError(404, "Alamat tidak ditemukan");
            }

            if (body.primary === true) {
                await tx.address.updateMany({
                    where: {
                        account_id,
                        primary: true,
                    },
                    data: {
                        primary: false,
                    },
                });
            }

            return tx.address.update({
                where: {
                    id: address_id,
                },
                data: { ...body, updated_at: new Date() },
            });
        });

        if (res.primary === true) {
            return res;
        }
    }

    static async list(account_id: string): Promise<{
        addresses: Array<
            Omit<
                ResponseAddressDTO,
                "account_id" | "created_at" | "updated_at" | "street" | "notes"
            >
        >;
        len: number;
    }> {
        const where: Prisma.AddressWhereInput = {
            account_id,
        };

        const [addresses, len] = await Promise.all([
            await prisma.address.findMany({
                where,
                omit: {
                    account_id: true,
                    created_at: true,
                    updated_at: true,
                    street: true,
                    notes: true,
                },
                orderBy: {
                    primary: "desc",
                },
            }),
            await prisma.address.count({
                where,
            }),
        ]);

        return { addresses, len };
    }

    static async detail(account_id: string, id: number): Promise<ResponseAddressDTO> {
        const res = await prisma.address.findUnique({
            where: {
                account_id,
                id,
            },
            omit: {
                account_id: true,
            },
        });
        if (!res) throw new ApiError(404, "Alamat anda tidak ditemukan");
        return res;
    }

    static async deleted(account_id: string, id: number) {
        const address = await this.detail(account_id, id);
        if (!address) throw new ApiError(404, "Alamat anda tidak ditemukan");
        if (address.primary) throw new ApiError(403, "Alamat utama tidak dapat dihapus");

        await prisma.address.delete({
            where: {
                account_id,
                id,
            },
        });
    }

    static async changePrimary(account_id: string, address_id: number) {
        const res = await prisma.$transaction(async (tx) => {
            // Pastikan address milik account
            const address = await tx.address.findUnique({
                where: {
                    id: address_id,
                    account_id,
                },
                select: { id: true },
            });

            if (!address) {
                throw new ApiError(404, "Alamat tidak ditemukan");
            }

            // Reset semua primary milik account
            await tx.address.updateMany({
                where: {
                    account_id,
                    primary: true,
                },
                data: {
                    primary: false,
                },
            });

            // Set primary baru
            return await tx.address.update({
                where: {
                    id: address_id,
                },
                data: {
                    primary: true,
                },
            });
        });

        return res;
    }
}
