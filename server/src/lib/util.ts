import { randomBytes, createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
export const randomToken = () => randomBytes(32).toString('hex');
export const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export const ref = (prefix = 'AR') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(7).toString('hex').toUpperCase()}`;
export const bad = (message: string, status = 400) => Object.assign(new Error(message), { status });
export const asyncWrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res, next)).catch(next); };
export const money = (n: number) => Number.isSafeInteger(n) && n >= 100 && n <= 100000000; // ₦1 to ₦1m per operation
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ZodError) {
        res.status(400).json({ error: 'Invalid input', details: err.flatten().fieldErrors });
        return;
    }
    const e = err as {
        message?: string;
        status?: number;
        code?: number;
    };
    if (e.code === 11000) {
        res.status(409).json({ error: 'A record with those details already exists.' });
        return;
    }
    const status = e.status || 500;
    if (status >= 500)
        console.error('[server error]', e);
    res.status(status).json({ error: status >= 500 ? 'Unexpected server error. Please try again.' : e.message || 'Request failed' });
}
export const userDTO = (u: any) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, status: u.status, verified: u.verified, kycStatus: u.kycStatus, avatar: u.avatar });

