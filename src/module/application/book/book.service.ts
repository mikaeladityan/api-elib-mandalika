import prisma from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { ApiError } from "../../../lib/errors/api.error.js";
import { normalizeSlug } from "../../../lib/index.js";
import { s3Service } from "../../../lib/s3.js";
import { GetPagination } from "../../../lib/utils/pagination.js";
import {
    QueryBookDTO,
    RequestBookDTO,
    RequestBookFileDTO,
    ResponseBookDTO,
} from "./book.schema.js";

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
                    cover_url: String(cover_url),
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
                select: {
                    id: true,
                    title: true,
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

            return book;
        });
    }

    static async update(id: string, body: RequestBookDTO, cover_file?: any) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.book.findUnique({
                where: { id },
                select: { id: true, title: true, cover_url: true },
            });

            if (!existing) {
                throw new ApiError(404, "Buku tidak ditemukan");
            }

            let finalCoverUrl = existing.cover_url;

            if (cover_file && cover_file.url) {
                if (existing.cover_url) {
                    try {
                        await s3Service.deleteByUrl(existing.cover_url);
                    } catch (err) {
                        console.error("Gagal hapus cover lama, lanjut...", err);
                    }
                }
                finalCoverUrl = cover_file.url;
            }

            // 3️⃣ VALIDATE AUTHORS
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

            // 4️⃣ UPDATE MAIN BOOK
            const updatedBook = await tx.book.update({
                where: { id },
                data: {
                    title: body.title,
                    slug: body.title !== existing.title ? normalizeSlug(body.title) : undefined,
                    cover_url: finalCoverUrl, // Menggunakan URL yang sudah diproses
                    description: body.description,
                    isbn: body.isbn,
                    language: body.language,
                    pages: body.pages,
                    publish_year: body.publish_year,
                    status: body.status,
                    publisher: {
                        connectOrCreate: {
                            where: { slug: normalizeSlug(body.publisher.name) },
                            create: {
                                name: body.publisher.name,
                                slug: normalizeSlug(body.publisher.name),
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    title: true,
                },
            });

            // 5️⃣ SYNC AUTHORS
            await tx.bookAuthor.deleteMany({ where: { book_id: id } });
            if (authorIds.length) {
                await tx.bookAuthor.createMany({
                    data: authorIds.map((author_id) => ({ book_id: id, author_id })),
                    skipDuplicates: true,
                });
            }

            // 6️⃣ SYNC CATEGORIES (Upsert Logic)
            await tx.bookCategory.deleteMany({ where: { book_id: id } });
            if (body.categories.length) {
                const uniqueCategories = [
                    ...new Map(body.categories.map((c) => [normalizeSlug(c.name), c])).values(),
                ];

                const categoryIds: number[] = [];
                for (const c of uniqueCategories) {
                    const slug = normalizeSlug(c.name);
                    const category = await tx.category.upsert({
                        where: { slug },
                        update: {},
                        create: { name: c.name, slug },
                    });
                    categoryIds.push(category.id);
                }

                await tx.bookCategory.createMany({
                    data: categoryIds.map((category_id) => ({ book_id: id, category_id })),
                    skipDuplicates: true,
                });
            }

            return updatedBook;
        });
    }

    static async softDelete(id: string) {
        const find = await prisma.book.findUnique({
            where: {
                id,
                deleted_at: null,
            },
        });

        if (!find) throw new ApiError(404, "Data buku tidak ditemukan");
        await prisma.$transaction(async (tx) => {
            await tx.book.update({
                where: {
                    id: find.id,
                },
                data: {
                    deleted_at: new Date(),
                    status: "DELETE",
                },
            });
        });
        return find.title;
    }

    static async restore(id: string) {
        const find = await prisma.book.findUnique({
            where: {
                id,
                deleted_at: {
                    not: null,
                },
            },
        });

        if (!find) throw new ApiError(404, "Data buku tidak ditemukan");
        await prisma.$transaction(async (tx) => {
            await tx.book.update({
                where: {
                    id: find.id,
                },
                data: {
                    deleted_at: null,
                    status: "ACTIVE",
                },
            });
        });

        return find.title;
    }

    static async destroy(id: string) {
        const find = await prisma.book.findUnique({
            where: {
                id,
                deleted_at: {
                    not: null,
                },
            },
            include: {
                files: true,
            },
        });

        if (!find) throw new ApiError(404, "Data buku tidak ditemukan");

        // Prepare list of S3 URLs to delete
        const urlsToDelete: string[] = [];
        if (find.cover_url) {
            urlsToDelete.push(find.cover_url);
        }
        if (find.files && find.files.length > 0) {
            find.files.forEach((f) => {
                if (f.file_url) urlsToDelete.push(f.file_url);
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.bookAuthor.deleteMany({
                where: {
                    book_id: find.id,
                },
            });
            await tx.bookCategory.deleteMany({
                where: {
                    book_id: find.id,
                },
            });
            await tx.bookFile.deleteMany({
                where: {
                    book_id: find.id,
                },
            });

            await tx.book.delete({
                where: {
                    id: find.id,
                },
            });
        });

        // Finally, cleanly remove items from S3
        if (urlsToDelete.length > 0) {
            Promise.allSettled(urlsToDelete.map((url) => s3Service.deleteByUrl(url))).catch(
                (err) => {
                    console.error("[S3_CLEANUP_DESTROY_ERROR]:", err);
                },
            );
        }
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
            slug: book.slug,
            description: book.description ?? undefined,
            cover_url: book.cover_url,
            isbn: book.isbn ?? undefined,
            language: book.language ?? undefined,
            publish_year: book.publish_year ?? undefined,
            pages: book.pages,
            status: book.status,

            publisher: {
                id: book.publisher?.id,
                name: book.publisher?.name ?? "",
                slug: book.publisher?.slug ?? "",
            },

            authors: book.authors.map((a) => ({
                id: a.author_id,
                first_name: a.author.first_name,
                last_name: a.author.last_name,
                bio: a.author.bio,
            })),

            categories: book.categories.map((c) => ({
                id: c.category_id,
                name: c.category.name,
                slug: c.category.slug,
            })),

            book_files: book.files.map((f) => ({
                id: f.id,
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
        status,
    }: QueryBookDTO): Promise<{
        data: Array<Omit<ResponseBookDTO, "authors" | "book_files">>;
        len: number;
    }> {
        const { skip, take: limit } = GetPagination(page, take);

        const andWhere: Prisma.BookWhereInput[] = [];
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
                slug: b.slug,
                description: b.description ?? undefined,
                cover_url: b.cover_url,
                isbn: b.isbn ?? undefined,
                language: b.language ?? undefined,
                publish_year: b.publish_year ?? undefined,
                pages: b.pages,
                status: b.status,

                publisher: {
                    name: b.publisher?.name ?? "",
                    slug: b.publisher?.slug ?? "",
                },

                categories: b.categories.map((c) => ({
                    name: c.category.name,
                    slug: c.category.slug,
                })),

                created_at: b.created_at,
                updated_at: b.updated_at,
                deleted_at: b.deleted_at ?? undefined,
            })),
        };
    }

    static async getOptions() {
        const [author, publisher, category] = await Promise.all([
            await prisma.author.findMany({
                where: {
                    deleted_at: null,
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                },
            }),

            await prisma.publisher.findMany({
                where: {
                    deleted_at: null,
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            }),

            await prisma.category.findMany({
                where: {
                    status: {
                        notIn: ["DELETE", "BLOCK"],
                    },
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            }),
        ]);

        return {
            author,
            publisher,
            category,
        };
    }

    static async addBookFile(id: string, body: RequestBookFileDTO) {
        const find = await prisma.book.findUnique({
            where: {
                id,
            },
        });

        if (!find) throw new ApiError(404, "Data buku tidak ditemukan");
        await prisma.bookFile.create({
            data: {
                file_type: body.file_type,
                file_url: body.file_url,
                pages: body.pages,
                size_kb: body.size_kb,
                book: {
                    connect: {
                        id: find.id,
                    },
                },
            },
        });
    }

    static async deleteBookFile(id: string, book_id: string) {
        // Use findFirst since id is the unique key, and book_id is just an extra constraint
        const findBookFile = await prisma.bookFile.findFirst({
            where: {
                id,
                book_id,
            },
        });

        if (!findBookFile) throw new ApiError(404, "Data file buku tidak ditemukan");

        await prisma.bookFile.delete({
            where: {
                id,
            },
        });

        // Attempt to remove from S3 storage
        try {
            await s3Service.deleteByUrl(findBookFile.file_url);
        } catch (err) {
            console.error("Gagal hapus file dari s3:", err);
        }
    }
}
