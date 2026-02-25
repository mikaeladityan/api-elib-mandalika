// import { Resend } from "resend";
// import "dotenv/config";
// import { logger } from "./logger.js";
// import { env } from "../config/env.js";

// export type EmailResult = { success: true } | { success: false; error: string };

// const resend = new Resend(env.RESEND_KEY!);

// const handleEmailError = (error: unknown, action: string, email: string): EmailResult => {
//     const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal";

//     logger.error(`Gagal melakukan ${action}`, {
//         email,
//         error: errorMessage,
//     });

//     return {
//         success: false,
//         error: `Kami mengalami kendala dalam memproses permintaan Anda. Silakan coba lagi nanti atau hubungi tim dukungan kami di ${env.CS_MAIL} jika masalah berlanjut.`,
//     };
// };

// // TEMPLATE DASAR UNTUK EMAIL (HTML)
// const baseTemplate = (content: string) => `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <title>${env.APP_NAME}</title>
//     <style>
//         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//         .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
//         .button {
//             display: inline-block;
//             padding: 12px 24px;
//             background-color: #2563eb;
//             color: white !important;
//             text-decoration: none;
//             border-radius: 4px;
//             font-weight: bold;
//             margin: 20px 0;
//         }
//         .footer {
//             margin-top: 30px;
//             padding-top: 20px;
//             border-top: 1px solid #eee;
//             font-size: 12px;
//             color: #666;
//         }
//         .support { color: #dc2626; font-weight: bold; }
//     </style>
// </head>
// <body>
//     <div class="container">
//         ${content}
//         <div class="footer">
//             <p>Salam hormat,<br>Tim ${env.APP_NAME}</p>
//             <p class="support">Butuh bantuan? Hubungi tim dukungan kami di
//                 <a href="mailto:${env.CS_MAIL}">${env.CS_MAIL}</a>
//             </p>
//         </div>
//     </div>
// </body>
// </html>
// `;

// // TEMPLATE EMAIL VERIFIKASI
// const verificationEmailTemplate = (email: string, token: string) => {
//     const verifyUrl = `${env.DASHBOARD_URL}/auth/verify-email?email=${encodeURIComponent(
//         email
//     )}&code=${token}`;

//     return baseTemplate(`
//     <h2>Verifikasi Alamat Email Anda</h2>
//     <p>Halo,</p>
//     <p>Terima kasih telah mendaftar! Silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>

//     <a href="${verifyUrl}" class="button">
//         Verifikasi Email
//     </a>

//     <p>Jika Anda tidak membuat akun, tidak perlu tindakan lebih lanjut.</p>

//     <p>Jika mengalami kesulitan dengan tombol di atas, salin dan tempel URL berikut di browser Anda:</p>
//     <p>${verifyUrl}</p>
//   `);
// };

// // TEMPLATE EMAIL RESET PASSWORD
// const forgotPasswordTemplate = (email: string, token: string) => {
//     const resetUrl = `${env.DASHBOARD_URL}/auth/reset-password?email=${encodeURIComponent(
//         email
//     )}&code=${token}`;

//     return baseTemplate(`
//     <h2>Atur Ulang Kata Sandi Anda</h2>
//     <p>Halo,</p>
//     <p>Anda menerima email ini karena kami menerima permintaan untuk mereset kata sandi akun Anda.</p>

//     <a href="${resetUrl}" class="button">
//         Reset Kata Sandi
//     </a>

//     <p class="support">Tautan reset kata sandi ini akan kedaluwarsa dalam 5 menit.</p>
//     <p>Jika Anda tidak meminta reset kata sandi, abaikan email ini atau hubungi tim dukungan kami segera.</p>

//     <p>Jika mengalami kesulitan dengan tombol di atas, salin dan tempel URL berikut di browser Anda:</p>
//     <p>${resetUrl}</p>
//   `);
// };

// // TEMPLATE EMAIL BERHASIL RESET (OPSIONAL)
// const passwordResetSuccessTemplate = (email: string) => {
//     return baseTemplate(`
//     <h2>Password Berhasil Diubah</h2>
//     <p>Halo,</p>
//     <p>Kata sandi untuk <strong>${email}</strong> telah berhasil diubah.</p>

//     <p class="support">Jika Anda tidak melakukan perubahan ini, segera hubungi tim dukungan kami.</p>
//   `);
// };

// // Fungsi untuk mengirim email verifikasi
// export const sendVerificationEmail = async (email: string, token: string): Promise<EmailResult> => {
//     try {
//         await resend.emails.send({
//             from: `${env.NAME_MAIL} <${env.COMPANY_MAIL}>`,
//             to: [email],
//             subject: "Verifikasi Alamat Email Anda",
//             html: verificationEmailTemplate(email, token),
//         });

//         logger.info("Email verifikasi berhasil dikirim", { email });
//         return { success: true };
//     } catch (error) {
//         return handleEmailError(error, "mengirim email verifikasi", email);
//     }
// };

// // Fungsi untuk mengirim email reset kata sandi
// export const sendPasswordResetEmail = async (
//     email: string,
//     token: string
// ): Promise<EmailResult> => {
//     try {
//         await resend.emails.send({
//             from: `${env.NAME_MAIL} <${env.COMPANY_MAIL}>`,
//             to: [email],
//             subject: "Reset Kata Sandi Anda",
//             html: forgotPasswordTemplate(email, token),
//         });

//         logger.info("Email reset kata sandi berhasil dikirim", { email });
//         return { success: true };
//     } catch (error) {
//         return handleEmailError(error, "mengirim email reset kata sandi", email);
//     }
// };

// // Fungsi opsional: email sukses reset kata sandi
// export const sendPasswordResetSuccessEmail = async (email: string): Promise<EmailResult> => {
//     try {
//         await resend.emails.send({
//             from: `${env.NAME_MAIL} <${env.COMPANY_MAIL}>`,
//             to: [email],
//             subject: "Password Anda Telah Diubah",
//             html: passwordResetSuccessTemplate(email),
//         });

//         logger.info("Email sukses reset kata sandi berhasil dikirim", { email });
//         return { success: true };
//     } catch (error) {
//         return handleEmailError(error, "mengirim email sukses reset kata sandi", email);
//     }
// };
