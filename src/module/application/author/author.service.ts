import prisma from "../../../config/prisma.js";
import { AuthorWhereInput } from "../../../generated/prisma/models.js";
import { ApiError } from "../../../lib/errors/api.error.js";
import { GetPagination } from "../../../lib/utils/pagination.js";
import { QueryAuthorDTO, RequestAuthorDTO, ResponseAuthorDTO } from "./author.schema.js";

export class AuthorService {
    static async create(body: RequestAuthorDTO) {
        await prisma.author.create({
            data: body,
        });
    }

    static async update(id: number, body: Partial<RequestAuthorDTO>) {
        const author = await prisma.author.findUnique({
            where: {
                id,
            },
        });

        if (!author) throw new ApiError(404, "Data penulis tidak ditemukan");

        await prisma.author.update({
            where: {
                id,
            },
            data: body,
        });
    }

    static async deleteMany(ids: number[]) {
        if (!ids.length) {
            throw new ApiError(400, "ID tidak boleh kosong");
        }

        // validasi id yang ada
        const existing = await prisma.author.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });

        if (!existing.length) {
            throw new ApiError(404, "Data penulis tidak ditemukan");
        }

        const result = await prisma.author.updateMany({
            where: {
                id: { in: ids },
                deleted_at: null, // hanya yang belum dihapus
            },
            data: {
                deleted_at: new Date(),
            },
        });

        return {
            requested: ids.length,
            affected: result.count,
        };
    }

    static async restoreMany(ids: number[]) {
        if (!ids.length) {
            throw new ApiError(400, "ID tidak boleh kosong");
        }

        const existing = await prisma.author.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });

        if (!existing.length) {
            throw new ApiError(404, "Data penulis tidak ditemukan");
        }

        const result = await prisma.author.updateMany({
            where: {
                id: { in: ids },
                deleted_at: { not: null }, // hanya yang sudah dihapus
            },
            data: {
                deleted_at: null,
            },
        });

        return {
            requested: ids.length,
            affected: result.count,
        };
    }

    static async destroyMany(ids: number[]) {
        if (!ids.length) {
            throw new ApiError(400, "ID tidak boleh kosong");
        }

        // pastikan data ada
        const existing = await prisma.author.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });

        if (!existing.length) {
            throw new ApiError(404, "Data penulis tidak ditemukan");
        }

        const result = await prisma.author.deleteMany({
            where: {
                id: { in: ids },
                deleted_at: { not: null }, // hanya yang sudah di-soft delete
            },
        });

        return {
            requested: ids.length,
            permanently_deleted: result.count,
        };
    }

    static async list({
        page = 1,
        take = 10,
        sortBy = "updated_at",
        sortOrder = "desc",
        status,
        search,
    }: QueryAuthorDTO): Promise<{
        data: Array<Omit<ResponseAuthorDTO, "books">>;
        len: number;
    }> {
        const { skip, take: limit } = GetPagination(page, take);

        const andWhere: AuthorWhereInput[] = [];
        if (status === "delete")
            andWhere.push({
                deleted_at: {
                    not: null,
                },
            });
        else
            andWhere.push({
                deleted_at: null,
            });
        if (search) {
            const terms = search.trim().split(/\s+/).filter(Boolean);

            andWhere.push({
                AND: terms.map((term) => ({
                    OR: [
                        {
                            first_name: {
                                contains: term,
                                mode: "insensitive",
                            },
                        },
                        {
                            last_name: {
                                contains: term,
                                mode: "insensitive",
                            },
                        },
                    ],
                })),
            });
        }

        const where: AuthorWhereInput = andWhere.length > 0 ? { AND: andWhere } : {};

        const [len, author] = await Promise.all([
            prisma.author.count({ where }),
            prisma.author.findMany({
                where,
                select: {
                    id: true,
                    last_name: true,
                    first_name: true,
                    bio: true,

                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },

                skip,
                take: limit,
            }),
        ]);

        return {
            len,
            data: author,
        };
    }

    static async detail(id: number): Promise<ResponseAuthorDTO> {
        // Nanti akan include books
        const author = await prisma.author.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
                last_name: true,
                first_name: true,
                bio: true,
                books: {
                    select: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                cover_url: true,
                                description: true,
                                isbn: true,
                                language: true,
                                status: true,
                                pages: true,
                                publish_year: true,
                                publisher: {
                                    select: {
                                        name: true,
                                        slug: true,
                                    },
                                },
                                categories: {
                                    select: {
                                        category: {
                                            select: {
                                                name: true,
                                                slug: true,
                                            },
                                        },
                                    },
                                },
                                created_at: true,
                                updated_at: true,
                                deleted_at: true,
                            },
                        },
                    },
                },
                created_at: true,
                updated_at: true,
                deleted_at: true,
            },
        });
        if (!author) throw new ApiError(404, "Data penulis tidak ditemukan");
        return {
            id: author.id,
            first_name: author.first_name,
            last_name: author.last_name,
            bio: author.bio,
            books: author.books.map((b) => ({
                title: b.book.title,
                slug: b.book.slug,
                status: b.book.status,
                cover_url: b.book.cover_url ?? undefined,
                description: b.book.description ?? undefined,
                isbn: b.book.isbn ?? undefined,
                language: b.book.language ?? undefined,
                publish_year: b.book.publish_year ?? undefined,
                pages: b.book.pages,
                publisher: {
                    name: b.book.publisher?.name ?? "",
                },
                categories: b.book.categories.map((c) => ({
                    name: c.category.name,
                    slug: c.category.slug,
                })),
            })),
            created_at: author.created_at,
            updated_at: author.updated_at,
            deleted_at: author.deleted_at,
        };
    }
}
