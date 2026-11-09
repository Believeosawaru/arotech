import type { Request, Response, NextFunction } from 'express';
import { Session, User } from '../models/index.js';
import { hash, bad } from '../lib/util.js';
import { env } from '../config.js';
export type Auth = {
    user: any;
    session: any;
};
declare global {
    namespace Express {
        interface Request {
            auth?: Auth;
            rawBody?: Buffer;
        }
    }
}
export const cookieName = 'arotech_session';
export const cookieConfig = { httpOnly: true, secure: env.COOKIE_SECURE === 'true', sameSite: env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none', path: '/', maxAge: 1000 * 60 * 60 * 24 * 7 };
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const cookie = req.cookies?.[cookieName];
        if (cookie && typeof cookie === 'string') {
            const session = await Session.findOne({ tokenHash: hash(cookie), expiresAt: { $gt: new Date() } });
            if (session) {
                const user = await User.findById(session.userId);
                if (user && user.status === 'active')
                    req.auth = { user, session };
            }
        }
        next();
    }
    catch (e) {
        next(e);
    }
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) { if (!req.auth)
    return next(bad('Please sign in.', 401)); next(); }
export function requireAdmin(req: Request, _res: Response, next: NextFunction) { if (req.auth?.user.role !== 'admin')
    return next(bad('Admin access required.', 403)); next(); }
export function requireCsrf(req: Request, _res: Response, next: NextFunction) { if (!req.auth || req.headers['x-csrf-token'] !== req.auth.session.csrf)
    return next(bad('Security token missing or invalid. Refresh and retry.', 403)); next(); }

