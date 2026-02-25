import axios from "axios";
import https from "https";
import { env } from "../../../../config/env.js";

export const addressHttp = axios.create({
    baseURL: env.ADDRESS_API,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
    httpsAgent:
        env.NODE_ENV === "development"
            ? new https.Agent({
                  rejectUnauthorized: false,
              })
            : undefined,
});
