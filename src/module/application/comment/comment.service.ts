import prisma from "../../../config/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { GetPagination } from "../../../lib/utils/pagination.js";
import { QueryGlobalCommentDTO } from "./comment.schema.js";

export class CommentService {
    static async list({
        page = 1,
        take = 20,
        sortOrder = "desc",
        status,
        search,
    }: QueryGlobalCommentDTO) {
        const { skip, take: limit } = GetPagination(page, take);

        const andWhere: Prisma.CommentWhereInput[] = [];

        if (status === "delete") {
            andWhere.push({ deleted_at: { not: null } });
        } else {
            andWhere.push({ deleted_at: null });
        }

        if (search) {
            andWhere.push({
                OR: [
                    { content: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                ],
            });
        }

        const where: Prisma.CommentWhereInput = andWhere.length > 0 ? { AND: andWhere } : {};

        const [len, comments] = await Promise.all([
            prisma.comment.count({ where }),
            prisma.comment.findMany({
                where,
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                        },
                    },
                },
                orderBy: { created_at: sortOrder },
                skip,
                take: limit,
            }),
        ]);

        return { len, data: comments };
    }
}
