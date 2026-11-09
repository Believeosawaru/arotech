import nodemailer from 'nodemailer';
import { env } from '../config.js';
export async function sendEmail(to: string, subject: string, body: string) {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
        if (env.NODE_ENV === 'development')
            console.log(`MAIL NOT CONFIGURED: ${subject} to ${to}. Local link: ${body}`);
        return false;
    }
    const transporter = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } });
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text: body });
    return true;
}

