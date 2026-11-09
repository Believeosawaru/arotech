import 'dotenv/config';
import { z } from 'zod';
const shape = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), PORT: z.coerce.number().int().min(1).default(5000),
    APP_MODE: z.literal('test').default('test'),
    MONGODB_URI: z.string().min(1), CLIENT_ORIGIN: z.string().url(),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'), COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
    PAYSTACK_SECRET_KEY: z.string().default(''), ENABLE_SANDBOX_FAUCET: z.enum(['true', 'false']).default('false'),
    SMTP_HOST: z.string().default(''), SMTP_PORT: z.coerce.number().default(587), SMTP_USER: z.string().default(''), SMTP_PASSWORD: z.string().default(''), SMTP_FROM: z.string().default('Arotech <no-reply@example.test>')
});
export const env = shape.parse(process.env);
if (env.PAYSTACK_SECRET_KEY && !env.PAYSTACK_SECRET_KEY.startsWith('sk_test_'))
    throw Error('This release supports ONLY Paystack TEST keys.');
if (env.COOKIE_SAMESITE === 'none' && env.COOKIE_SECURE !== 'true')
    throw Error('SameSite=None requires secure cookies.');
if (env.NODE_ENV === 'production' && env.ENABLE_SANDBOX_FAUCET === 'true')
    console.warn('WARNING: Sandbox faucet enabled in production deployment. Disable for public deployments.');

