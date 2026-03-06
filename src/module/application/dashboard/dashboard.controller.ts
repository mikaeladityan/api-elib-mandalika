import { Context } from "hono";
import { DashboardService } from "./dashboard.service.js";
import { ApiResponse } from "../../../lib/api.response.js";

export class DashboardController {
    static async getStats(c: Context) {
        const result = await DashboardService.getStats();
        return ApiResponse.sendSuccess(c, result, 200);
    }
}
