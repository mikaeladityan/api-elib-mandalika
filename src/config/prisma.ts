import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";
import { dbLogger, logger } from "../lib/logger.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({
    adapter,
    log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
    ],
    errorFormat: env.isDevelopment ? "pretty" : "minimal",
});

/* ============================
   Prisma Event Observability
============================ */

prisma.$on("query", (e: any) => {
    if (env.isDevelopment) {
        dbLogger.info("Query executed", {
            type: "QUERY",
            query: e.query,
            params: e.params,
            duration_ms: e.duration,
        });
    }

    if (e.duration > 1000) {
        dbLogger.warn("Slow query detected", {
            type: "SLOW_QUERY",
            query: e.query,
            duration_ms: e.duration,
        });
    }
});

prisma.$on("error", (e: any) => {
    dbLogger.error("Database error", {
        type: "ERROR",
        message: e.message,
        target: e.target,
    });
});

prisma.$on("warn", (e: any) => {
    dbLogger.warn("Database warning", {
        type: "WARN",
        message: e.message,
        target: e.target,
    });
});

/**
 * Initialize database connection with retry logic
 */
export const initializeDatabase = async (maxRetries = 5, delay = 1000): Promise<void> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Test connection with a simple query
            await prisma.$queryRaw`SELECT 1`;

            logger.info("Database connected successfully");
            return;
        } catch (error) {
            logger.error(`Database connection attempt ${attempt} failed:`, error);

            if (attempt === maxRetries) {
                throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
            }

            const waitTime = delay * Math.pow(2, attempt - 1);
            logger.info(`Retrying in ${waitTime}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }
};

/**
 * Gracefully disconnect from database
 */
export const closeDatabase = async (): Promise<void> => {
    try {
        await prisma.$disconnect();
        logger.info("Database disconnected gracefully");
    } catch (error) {
        logger.error("Error during database disconnect", error);
        throw error;
    }
};

export default prisma;
