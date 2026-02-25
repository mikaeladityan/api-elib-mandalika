import * as crypto from "crypto";
import slugify from "slugify";
import z from "zod";
export const normalizeSlug = (v: string) => slugify.default(v, { lower: true, strict: true });

export const generateHexToken = (): string => {
    return crypto.randomBytes(32).toString("hex");
};

export const TimeSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)");

export const DecimalSchema = z
    .union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format")])
    .transform(Number);
