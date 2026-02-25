import { Context } from "hono";
import { QueryLoggingActivityDTO } from "./log.schema.js";
import { ListLogger } from "./log.service.js";
import { ApiResponse } from "../../../lib/api.response.js";

export class LogController {
    static async list(c: Context) {
        const { search, page, sortBy, sortOrder, take, log_activity } = c.req.query();

        const params: QueryLoggingActivityDTO = {
            page: page ? Number(page) : undefined,
            search,
            sortBy: sortBy as QueryLoggingActivityDTO["sortBy"],
            sortOrder: sortOrder as QueryLoggingActivityDTO["sortOrder"],
            take: take ? Number(take) : undefined,
            log_activity: log_activity as QueryLoggingActivityDTO["log_activity"],
        };

        const res = await ListLogger(params);
        return ApiResponse.sendSuccess(c, res, 200);
    }
}
