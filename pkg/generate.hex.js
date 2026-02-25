import { randomBytes } from "crypto";

// 16 bytes = 32 karakter hex
const hex = randomBytes(16).toString("hex");

console.log(hex);
