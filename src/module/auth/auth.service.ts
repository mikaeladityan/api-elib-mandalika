import { Account, User } from "../../generated/prisma/client.js";
import { LoginRequestDTO, RegisterRequestDTO } from "./auth.schema.js";
import prisma from "../../config/prisma.js";
import { ApiError } from "../../lib/errors/api.error.js";
import bcrypt from "bcrypt";
import { env } from "../../config/env.js";
import { generateHexToken } from "../../lib/index.js";
import { STATUS } from "../../generated/prisma/enums.js";

type AuthResponse = Omit<
    Account & {
        sub: string;
    },
    "id" | "created_at" | "updated_at" | "deleted_at" | "password"
> & {
    user?: Omit<
        User,
        "id" | "account_id" | "created_at" | "updated_at" | "deleted_at" | "password"
    > | null;
};

export class AuthService {
    // Register
    private static async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(env.SALT_ROUND);
        return bcrypt.hash(password, salt);
    }
    static async register(body: RegisterRequestDTO) {
        const { email, password } = body;
        const findEmail = await this.findEmail(email);
        if (findEmail) throw new ApiError(400, "Email telah digunakan");

        const hashedPassword = await this.hashPassword(password);

        body = {
            email,
            password: hashedPassword,
        };

        if (env.EMAIL_VERIFICATION === true) {
            const now = new Date();
            // Kode verifikasi berlaku selama 5 menit
            const expired = new Date(now.getTime() + 5 * 60 * 1000);
            const code = generateHexToken();
            await prisma.account.create({
                data: {
                    ...body,
                    email_verify: {
                        create: {
                            code,
                            expired_at: expired,
                        },
                    },
                },
            });
        } else {
            await prisma.account.create({
                data: {
                    status: "ACTIVE",
                    ...body,
                },
            });
        }
    }

    static async login(body: LoginRequestDTO): Promise<AuthResponse> {
        const { email, password } = body;
        const account = await prisma.account.findUnique({
            where: {
                email,
                status: {
                    notIn: ["BLOCK", "DELETE", "PENDING"],
                },
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                password: true,
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        phone: true,
                        photo: true,
                        whatsapp: true,
                    },
                },
            },
        });
        if (!account?.email) throw new ApiError(401, "Email atau Password Salah");

        const comparePassword = await bcrypt.compare(password, account.password);
        if (!comparePassword) throw new ApiError(401, "Email atau Password Salah");

        return {
            sub: account.id,
            email: account.email,
            role: account.role,
            status: account.status,
            user: account.user && { ...account.user },
        };
    }

    // Helper Method
    private static async findEmail(
        email: string,
    ): Promise<{ email: string; password?: string; status?: STATUS } | null> {
        const find = await prisma.account.findUnique({
            where: {
                email,
            },
            select: {
                email: true,
                password: true,
                status: true,
            },
        });

        return find;
    }
}
