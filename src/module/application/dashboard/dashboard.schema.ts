import z from "zod";

export const ResponseDashboardStatsSchema = z.object({
    total_books: z.number(),
    total_authors: z.number(),
    total_categories: z.number(),
    total_users: z.number(),
});

export type ResponseDashboardStatsDTO = z.infer<typeof ResponseDashboardStatsSchema>;
