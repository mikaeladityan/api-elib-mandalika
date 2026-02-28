import prisma from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { ApiError } from "../../../lib/errors/api.error.js";
import { GetPagination } from "../../../lib/utils/pagination.js";
import {
    QueryPostDTO,
    RequestPostDTO,
    ResponsePostDTO,
    QueryCommentDTO,
    RequestCommentDTO,
    ResponseCommentDTO,
} from "./post.schema.js";

export class PostService {
    // ==========================================
    // POST (Status Updates) METHODS
    // ==========================================

    static async create(body: RequestPostDTO) {
        const post = await prisma.post.create({
            data: {
                content: body.content,
                status: body.status,
            },
        });
        return post;
    }

    static async update(id: string, body: Partial<RequestPostDTO>) {
        const existing = await prisma.post.findUnique({
            where: { id },
        });

        if (!existing) throw new ApiError(404, "Data post tidak ditemukan");

        return await prisma.post.update({
            where: { id },
            data: {
                content: body.content,
                status: body.status,
            },
        });
    }

    static async softDelete(id: string) {
        const existing = await prisma.post.findUnique({
            where: { id, deleted_at: null },
        });

        if (!existing) throw new ApiError(404, "Data post tidak ditemukan");

        await prisma.post.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                status: "DELETE",
            },
        });

        return existing.id;
    }

    static async restore(id: string) {
        const existing = await prisma.post.findUnique({
            where: { id, deleted_at: { not: null } },
        });

        if (!existing) throw new ApiError(404, "Data post tidak ditemukan");

        await prisma.post.update({
            where: { id },
            data: {
                deleted_at: null,
                status: "ACTIVE",
            },
        });

        return existing.id;
    }

    static async destroy(id: string) {
        const existing = await prisma.post.findUnique({
            where: { id },
        });

        if (!existing) throw new ApiError(404, "Data post tidak ditemukan");

        await prisma.$transaction([
            prisma.comment.deleteMany({
                where: { post_id: id },
            }),
            prisma.post.delete({
                where: { id },
            }),
        ]);
    }

    static async detail(id: string): Promise<ResponsePostDTO> {
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { comments: true },
                },
            },
        });

        if (!post) throw new ApiError(404, "Data post tidak ditemukan");

        return post as ResponsePostDTO;
    }

    static async list({
        page = 1,
        take = 10,
        sortBy = "created_at",
        sortOrder = "desc",
        status,
        search,
    }: QueryPostDTO): Promise<{
        data: Array<ResponsePostDTO>;
        len: number;
    }> {
        const { skip, take: limit } = GetPagination(page, take);

        const andWhere: Prisma.PostWhereInput[] = [];

        if (status === "delete") {
            andWhere.push({ deleted_at: { not: null } });
        } else {
            andWhere.push({ deleted_at: null, status: "ACTIVE" });
        }

        if (search) {
            andWhere.push({
                content: {
                    contains: search,
                    mode: "insensitive",
                },
            });
        }

        const where: Prisma.PostWhereInput = andWhere.length > 0 ? { AND: andWhere } : {};

        const [len, posts] = await Promise.all([
            prisma.post.count({ where }),
            prisma.post.findMany({
                where,
                include: {
                    _count: {
                        select: { comments: true },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
        ]);

        return {
            len,
            data: posts as ResponsePostDTO[],
        };
    }

    // ==========================================
    // COMMENT METHODS
    // ==========================================

    static async prepareComments(comments: any[]): Promise<ResponseCommentDTO[]> {
        // Recursive function to build nested threaded comments
        // We only fetch parent_id == null for list, then recursively nest the replies
        const mapComment = (c: any): ResponseCommentDTO => {
            return {
                id: c.id,
                post_id: c.post_id,
                parent_id: c.parent_id,
                name: c.name,
                content: c.content,
                status: c.status,
                created_at: c.created_at,
                updated_at: c.updated_at,
                deleted_at: c.deleted_at,
                replies: c.replies ? c.replies.map((reply: any) => mapComment(reply)) : [],
            };
        };

        return comments.map(mapComment);
    }

    static async listComments(
        post_id: string,
        {
            page = 1,
            take = 50,
            sortOrder = "asc", // older comments first typically
            search,
        }: QueryCommentDTO,
    ): Promise<{
        data: Array<ResponseCommentDTO>;
        len: number;
    }> {
        const { skip, take: limit } = GetPagination(page, take);

        const andWhere: Prisma.CommentWhereInput[] = [
            { post_id },
            { deleted_at: null },
            { parent_id: null }, // Only fetch top-level comments directly, populate threads inside
        ];

        if (search) {
            andWhere.push({
                OR: [
                    { content: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                ],
            });
        }

        const where: Prisma.CommentWhereInput = { AND: andWhere };

        const [len, comments] = await Promise.all([
            prisma.comment.count({ where }),
            prisma.comment.findMany({
                where,
                orderBy: { created_at: sortOrder },
                skip,
                take: limit,
                // Include replies dynamically up to 4 levels deep with strict 10-cap limits per reply bucket
                include: {
                    replies: {
                        where: { deleted_at: null },
                        orderBy: { created_at: "asc" },
                        take: 10,
                        include: {
                            replies: {
                                where: { deleted_at: null },
                                orderBy: { created_at: "asc" },
                                take: 10,
                                include: {
                                    replies: {
                                        where: { deleted_at: null },
                                        orderBy: { created_at: "asc" },
                                        take: 10,
                                        include: {
                                            replies: {
                                                where: { deleted_at: null },
                                                orderBy: { created_at: "asc" },
                                                take: 10,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            len,
            data: await this.prepareComments(comments),
        };
    }

    static async createComment(post_id: string, body: RequestCommentDTO) {
        // Verify post exists
        const post = await prisma.post.findUnique({ where: { id: post_id, deleted_at: null } });
        if (!post) throw new ApiError(404, "Post (Status) tidak ditemukan atau sudah dihapus");

        if (body.parent_id) {
            const parentComment = await prisma.comment.findUnique({
                where: { id: body.parent_id, post_id, deleted_at: null },
            });
            if (!parentComment) throw new ApiError(404, "Komentar balas tidak ditemukan");
        }

        return await prisma.comment.create({
            data: {
                post_id,
                parent_id: body.parent_id || null,
                name: body.name,
                content: body.content,
            },
        });
    }

    static async deleteComment(id: string) {
        // Sincecomments are public, they are usually only deleted by admins, so we just use standard delete
        const comment = await prisma.comment.findUnique({ where: { id } });
        if (!comment) throw new ApiError(404, "Komentar tidak ditemukan");

        // We can do softDelete or hard delete. Let's do soft delete just like others.
        await prisma.comment.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                status: "DELETE",
            },
        });
    }
}
