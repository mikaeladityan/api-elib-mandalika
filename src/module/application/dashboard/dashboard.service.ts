import prisma from "../../../config/prisma.js";
import { ResponseDashboardStatsDTO } from "./dashboard.schema.js";

export class DashboardService {
    static async getStats(): Promise<ResponseDashboardStatsDTO> {
        const [total_books, total_authors, total_categories, total_users] = await Promise.all([
            prisma.book.count({ where: { deleted_at: null } }),
            prisma.author.count({ where: { deleted_at: null } }),
            prisma.category.count(),
            prisma.user.count({ where: { deleted_at: null } }),
        ]);

        return {
            total_books,
            total_authors,
            total_categories,
            total_users,
        };
    }
}
