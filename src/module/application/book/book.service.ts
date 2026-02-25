import prisma from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { ApiError } from "../../../lib/errors/api.error.js";
import { normalizeSlug } from "../../../lib/index.js";
import { GetPagination } from "../../../lib/utils/pagination.js";
import { QueryBookDTO, RequestBookDTO, ResponseBookDTO } from "./book.schema.js";

export class BookService {
    static async create(body: RequestBookDTO, cover_url: string) {
        return prisma.$transaction(async (tx) => {
            const authorIds = body.authors.map((a) => a.author_id);

            if (authorIds.length) {
                const existingAuthors = await tx.author.findMany({
                    where: { id: { in: authorIds } },
                    select: { id: true },
                });

                if (existingAuthors.length !== authorIds.length) {
                    throw new ApiError(400, "Beberapa author tidak ditemukan");
                }
            }

            const book = await tx.book.create({
                data: {
                    title: body.title,
                    slug: normalizeSlug(body.title),
                    cover_url,
                    description: body.description,
                    isbn: body.isbn,
                    language: body.language,
                    pages: body.pages,
                    publish_year: body.publish_year,
                    status: body.status ?? "ACTIVE",

                    publisher: {
                        connectOrCreate: {
                            where: {
                                slug: normalizeSlug(body.publisher.name),
                            },
                            create: {
                                name: body.publisher.name,
                                slug: normalizeSlug(body.publisher.name),
                            },
                        },
                    },
                },
            });

            if (authorIds.length) {
                await tx.bookAuthor.createMany({
                    data: authorIds.map((author_id) => ({
                        book_id: book.id,
                        author_id,
                    })),
                    skipDuplicates: true,
                });
            }

            if (body.categories.length) {
                const categoriesData = await Promise.all(
                    body.categories.map(async (c) => {
                        const slug = normalizeSlug(c.name);

                        const category = await tx.category.upsert({
                            where: { slug },
                            update: {},
                            create: {
                                name: c.name,
                                slug,
                            },
                        });

                        return category.id;
                    }),
                );

                await tx.bookCategory.createMany({
                    data: categoriesData.map((category_id) => ({
                        book_id: book.id,
                        category_id,
                    })),
                    skipDuplicates: true,
                });
            }

            if (body.book_files.length) {
                await tx.bookFile.createMany({
                    data: body.book_files.map((file) => ({
                        book_id: book.id,
                        file_url: file.file_url,
                        file_type: file.file_type,
                        size_kb: file.size_kb,
                        pages: file.pages,
                    })),
                });
            }

            return book;
        });
    }

    static async update(id: string, body: RequestBookDTO, cover_url?: string) {
        return prisma.$transaction(async (tx) => {
            /* --------------------------------------------------
           1️⃣ CHECK EXISTENCE
        -------------------------------------------------- */
            const existing = await tx.book.findUnique({
                where: { id },
                select: { id: true, title: true, cover_url: true },
            });

            if (!existing) {
                throw new ApiError(404, "Buku tidak ditemukan");
            }

            /* --------------------------------------------------
           2️⃣ VALIDATE AUTHORS
        -------------------------------------------------- */
            const authorIds = [...new Set(body.authors.map((a) => a.author_id))];

            if (authorIds.length) {
                const foundAuthors = await tx.author.findMany({
                    where: { id: { in: authorIds } },
                    select: { id: true },
                });

                if (foundAuthors.length !== authorIds.length) {
                    throw new ApiError(400, "Beberapa author tidak ditemukan");
                }
            }

            /* --------------------------------------------------
           3️⃣ UPDATE MAIN BOOK
        -------------------------------------------------- */
            const updatedBook = await tx.book.update({
                where: { id },
                data: {
                    title: body.title,
                    slug: body.title !== existing.title ? normalizeSlug(body.title) : undefined,

                    cover_url: cover_url ?? existing.cover_url,
                    description: body.description,
                    isbn: body.isbn,
                    language: body.language,
                    pages: body.pages,
                    publish_year: body.publish_year,
                    status: body.status,

                    publisher: {
                        connectOrCreate: {
                            where: {
                                slug: normalizeSlug(body.publisher.name),
                            },
                            create: {
                                name: body.publisher.name,
                                slug: normalizeSlug(body.publisher.name),
                            },
                        },
                    },
                },
            });

            /* --------------------------------------------------
           4️⃣ SYNC AUTHORS (pivot)
        -------------------------------------------------- */
            await tx.bookAuthor.deleteMany({
                where: { book_id: id },
            });

            if (authorIds.length) {
                await tx.bookAuthor.createMany({
                    data: authorIds.map((author_id) => ({
                        book_id: id,
                        author_id,
                    })),
                    skipDuplicates: true,
                });
            }

            /* --------------------------------------------------
           5️⃣ SYNC CATEGORIES
        -------------------------------------------------- */
            await tx.bookCategory.deleteMany({
                where: { book_id: id },
            });

            if (body.categories.length) {
                const uniqueCategories = [
                    ...new Map(body.categories.map((c) => [normalizeSlug(c.name), c])).values(),
                ];

                const categoryIds = await Promise.all(
                    uniqueCategories.map(async (c) => {
                        const slug = normalizeSlug(c.name);

                        const category = await tx.category.upsert({
                            where: { slug },
                            update: {},
                            create: {
                                name: c.name,
                                slug,
                            },
                        });

                        return category.id;
                    }),
                );

                await tx.bookCategory.createMany({
                    data: categoryIds.map((category_id) => ({
                        book_id: id,
                        category_id,
                    })),
                    skipDuplicates: true,
                });
            }

            /* --------------------------------------------------
           6️⃣ SYNC BOOK FILES (DELETE ALL + INSERT NEW)
        -------------------------------------------------- */

            // ⚠ Menghapus SEMUA record file lama
            await tx.bookFile.deleteMany({
                where: { book_id: id },
            });

            if (body.book_files.length) {
                await tx.bookFile.createMany({
                    data: body.book_files.map((file) => ({
                        book_id: id,
                        file_url: file.file_url,
                        file_type: file.file_type,
                        size_kb: file.size_kb,
                        pages: file.pages,
                    })),
                });
            }

            return updatedBook;
        });
    }

    static async softDeleteMany(ids: string[]) {
        return prisma.$transaction(async (tx) => {
            const books = await tx.book.findMany({
                where: { id: { in: ids } },
                select: { id: true, deleted_at: true },
            });

            if (!books.length) {
                throw new ApiError(404, "Data buku tidak ditemukan");
            }

            const invalid = books.filter((b) => b.deleted_at !== null);
            if (invalid.length) {
                throw new ApiError(400, "Beberapa buku sudah dihapus");
            }

            await tx.book.updateMany({
                where: {
                    id: { in: ids },
                    deleted_at: null,
                },
                data: {
                    deleted_at: new Date(),
                    status: "DELETE",
                },
            });
        });
    }

    static async restoreMany(ids: string[]) {
        return prisma.$transaction(async (tx) => {
            const books = await tx.book.findMany({
                where: { id: { in: ids } },
                select: { id: true, deleted_at: true },
            });

            if (!books.length) {
                throw new ApiError(404, "Data buku tidak ditemukan");
            }

            const invalid = books.filter((b) => b.deleted_at === null);
            if (invalid.length) {
                throw new ApiError(400, "Beberapa buku belum dihapus");
            }

            await tx.book.updateMany({
                where: {
                    id: { in: ids },
                    deleted_at: { not: null },
                },
                data: {
                    deleted_at: null,
                    status: "ACTIVE",
                },
            });
        });
    }

    static async destroyMany(ids: string[]) {
        return prisma.$transaction(async (tx) => {
            /**
             * 1️⃣ pastikan data ada
             */
            const books = await tx.book.findMany({
                where: { id: { in: ids } },
                select: { id: true },
            });

            if (!books.length) {
                throw new ApiError(404, "Data buku tidak ditemukan");
            }

            const bookIds = books.map((b) => b.id);

            /**
             * 2️⃣ hapus semua file buku
             */
            await tx.bookFile.deleteMany({
                where: { book_id: { in: bookIds } },
            });

            /**
             * 3️⃣ hapus pivot author
             */
            await tx.bookAuthor.deleteMany({
                where: { book_id: { in: bookIds } },
            });

            /**
             * 4️⃣ hapus pivot category
             */
            await tx.bookCategory.deleteMany({
                where: { book_id: { in: bookIds } },
            });

            /**
             * 5️⃣ hapus buku
             */
            await tx.book.deleteMany({
                where: { id: { in: bookIds } },
            });
        });
    }

    static async detail(id: string): Promise<ResponseBookDTO> {
        const book = await prisma.book.findUnique({
            where: { id },
            include: {
                publisher: true,
                authors: {
                    include: {
                        author: true,
                    },
                },
                categories: {
                    include: {
                        category: true,
                    },
                },
                files: true,
            },
        });

        if (!book) throw new ApiError(404, "Buku tidak ditemukan");

        return {
            id: book.id,
            title: book.title,
            description: book.description ?? undefined,
            cover_url: book.cover_url ?? undefined,
            isbn: book.isbn ?? undefined,
            language: book.language ?? undefined,
            publish_year: book.publish_year ?? undefined,
            pages: book.pages,
            status: book.status,

            publisher: {
                id: book.publisher?.id,
                name: book.publisher?.name ?? "",
            },

            authors: book.authors.map((a) => ({
                author_id: a.author_id,
                first_name: a.author.first_name,
                last_name: a.author.last_name,
                bio: a.author.bio,
            })),

            categories: book.categories.map((c) => ({
                id: c.category_id,
                name: c.category.name,
            })),

            book_files: book.files.map((f) => ({
                file_url: f.file_url,
                file_type: f.file_type,
                size_kb: f.size_kb ?? 0,
                pages: f.pages ?? 0,
            })),

            created_at: book.created_at,
            updated_at: book.updated_at,
            deleted_at: book.deleted_at ?? undefined,
        };
    }

    static async list({
        page = 1,
        take = 10,
        sortBy = "updated_at",
        sortOrder = "desc",
        search,
        category_slug,
        author,
        publisher,
        publish_year,
        language,
        pages,
    }: QueryBookDTO): Promise<{
        data: Array<Omit<ResponseBookDTO, "authors" | "book_files">>;
        len: number;
    }> {
        const { skip, take: limit } = GetPagination(page, take);

        const andWhere: Prisma.BookWhereInput[] = [];

        if (search) {
            andWhere.push({
                title: {
                    contains: search,
                    mode: "insensitive",
                },
            });
        }

        if (category_slug) {
            andWhere.push({
                categories: {
                    some: {
                        category: {
                            slug: category_slug,
                        },
                    },
                },
            });
        }

        if (author) {
            andWhere.push({
                authors: {
                    some: {
                        author: {
                            OR: [
                                { first_name: { contains: author, mode: "insensitive" } },
                                { last_name: { contains: author, mode: "insensitive" } },
                            ],
                        },
                    },
                },
            });
        }

        if (publisher) {
            andWhere.push({
                publisher: {
                    name: { contains: publisher, mode: "insensitive" },
                },
            });
        }

        if (publish_year) {
            andWhere.push({ publish_year });
        }

        if (language) {
            andWhere.push({
                language: {
                    equals: language,
                    mode: "insensitive",
                },
            });
        }

        if (pages) {
            andWhere.push({ pages });
        }

        const where: Prisma.BookWhereInput = andWhere.length > 0 ? { AND: andWhere } : {};

        const [len, books] = await Promise.all([
            prisma.book.count({ where }),
            prisma.book.findMany({
                where,
                include: {
                    publisher: true,
                    categories: {
                        include: { category: true },
                    },
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
            data: books.map((b) => ({
                id: b.id,
                title: b.title,
                description: b.description ?? undefined,
                cover_url: b.cover_url ?? undefined,
                isbn: b.isbn ?? undefined,
                language: b.language ?? undefined,
                publish_year: b.publish_year ?? undefined,
                pages: b.pages,
                status: b.status,

                publisher: {
                    name: b.publisher?.name ?? "",
                },

                categories: b.categories.map((c) => ({
                    name: c.category.name,
                })),

                created_at: b.created_at,
                updated_at: b.updated_at,
                deleted_at: b.deleted_at ?? undefined,
            })),
        };
    }
}
