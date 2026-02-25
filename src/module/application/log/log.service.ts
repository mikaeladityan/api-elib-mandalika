import prisma from "../../../config/prisma.js";
import { LoggingActivityWhereInput } from "../../../generated/prisma/models.js";
import { GetPagination } from "../../../lib/utils/pagination.js";
import {
    CreateLoggingActivityDTO,
    QueryLoggingActivityDTO,
    ResponseLoggingActivityDTO,
} from "./log.schema.js";

export async function CreateLogger(data: CreateLoggingActivityDTO) {
    console.log(data);
    await prisma.loggingActivity.create({
        data: {
            ...data,
            account_id: data.account_id,
        },
    });
}

export async function ListLogger({
    sortBy = "created_at",
    sortOrder = "desc",
    log_activity,
    page,
    search,
    take,
}: QueryLoggingActivityDTO): Promise<{ data: Array<ResponseLoggingActivityDTO>; len: number }> {
    const { skip, take: limit } = GetPagination(page, take);
    const andWhere: LoggingActivityWhereInput[] = [];
    if (log_activity) andWhere.push({ activity: log_activity });
    if (search) {
        andWhere.push({
            OR: [
                {
                    account_id: {
                        contains: search,
                    },
                },
                {
                    account: {
                        email: {
                            contains: search,
                        },
                    },
                },
            ],
        });
    }

    const where: LoggingActivityWhereInput = andWhere.length > 0 ? { AND: andWhere } : {};

    const [len, log] = await Promise.all([
        prisma.loggingActivity.count({ where }),
        prisma.loggingActivity.findMany({
            where,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: {
                account: {
                    select: {
                        email: true,
                    },
                },
            },
            skip,
            take: limit,
        }),
    ]);

    const logFormated: Array<ResponseLoggingActivityDTO> = log.map((l) => ({
        account_id: String(l.account_id),
        activity: l.activity,
        created_at: l.created_at,
        description: l.description,
        email: String(l.account?.email),
        resource: l.resource,
        id: l.id,
    }));

    return {
        data: logFormated,
        len,
    };
}
