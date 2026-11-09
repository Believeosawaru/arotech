import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { User, Session, Token, Card, Account } from '../models/index.js';
import { asyncWrap, bad, randomToken, hash, userDTO } from '../lib/util.js';
import { requireAuth, requireCsrf, cookieConfig, cookieName } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { env } from '../config.js';
import { clientOriginForRequest } from '../lib/origin.js';
const router = Router();
const credentials = z.object({ email: z.string().email().max(180).transform(x => x.toLowerCase()), password: z.string().min(10).max(128) });
async function loginSession(req: any, res: any, user: any) {
    const token = randomToken(), csrf = randomToken();
    const s = await Session.create({ userId: user._id, tokenHash: hash(token), csrf, expiresAt: new Date(Date.now() + 7 * 86400000), ip: req.ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 255) });
    res.cookie(cookieName, token, cookieConfig);
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
    return { user: userDTO(user), csrf, sessionId: String(s._id) };
}
async function issueToken(user: any, kind: 'verify' | 'reset', origin = env.CLIENT_ORIGIN) {
    const token = randomToken();
    await Token.create({ userId: user._id, tokenHash: hash(token), kind, expiresAt: new Date(Date.now() + (kind === 'verify' ? 24 : 0.5) * 3600000) });
    const link = `${origin}/${kind === 'verify' ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(token)}`;
    const sent = await sendEmail(user.email, kind === 'verify' ? 'Verify your Arotech email' : 'Reset your Arotech password', `Follow this link to ${kind === 'verify' ? 'verify your address' : 'reset your password'}: ${link}`);
    return { sent, ...(env.NODE_ENV === 'development' && !sent ? { developmentLink: link } : {}) };
}
router.post('/register', asyncWrap(async (req, res) => {
    const data = credentials.extend({ name: z.string().trim().min(2).max(90) }).parse(req.body);
    if (await User.exists({ email: data.email }))
        throw bad('This email is already registered.', 409);
    const user = await User.create({ name: data.name, email: data.email, passwordHash: await argon2.hash(data.password, { type: argon2.argon2id }) });
    await Account.create({ ownerId: user._id, kind: 'wallet', normalSide: 'credit' });
    await Card.create({ ownerId: user._id, label: 'Everyday' });
    let verification: any = { sent: false };
    try {
        verification = await issueToken(user, 'verify', clientOriginForRequest(req.get('origin')));
    }
    catch (e) {
        console.error('Verification email failed', e);
    }
    res.status(201).json({ ...await loginSession(req, res, user), verification });
}));
router.post('/login', asyncWrap(async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await argon2.verify(user.passwordHash, password)))
        throw bad('Invalid email or password.', 401);
    if (user.status !== 'active')
        throw bad('This account is suspended.', 403);
    res.json(await loginSession(req, res, user));
}));
router.get('/me', asyncWrap(async (req, res) => { if (!req.auth)
    throw bad('Please sign in.', 401); res.json({ user: userDTO(req.auth.user), csrf: req.auth.session.csrf }); }));
router.post('/logout', requireAuth, requireCsrf, asyncWrap(async (req, res) => { await Session.deleteOne({ _id: req.auth!.session._id }); res.clearCookie(cookieName, { path: '/', sameSite: env.COOKIE_SAMESITE, secure: env.COOKIE_SECURE === 'true' }); res.json({ ok: true }); }));
router.get('/sessions', requireAuth, asyncWrap(async (req, res) => { const sessions = await Session.find({ userId: req.auth!.user._id }).sort({ createdAt: -1 }).lean(); res.json(sessions.map(s => ({ id: String(s._id), createdAt: s.createdAt, expiresAt: s.expiresAt, userAgent: s.userAgent, current: String(s._id) === String(req.auth!.session._id) }))); }));
router.delete('/sessions/:id', requireAuth, requireCsrf, asyncWrap(async (req, res) => { await Session.deleteOne({ _id: req.params.id, userId: req.auth!.user._id }); res.json({ ok: true }); }));
router.patch('/profile', requireAuth, requireCsrf, asyncWrap(async (req, res) => { const data = z.object({ name: z.string().trim().min(2).max(90).optional() }).parse(req.body); const user = await User.findByIdAndUpdate(req.auth!.user._id, { $set: data }, { new: true }); res.json({ user: userDTO(user) }); }));
router.post('/change-password', requireAuth, requireCsrf, asyncWrap(async (req, res) => {
    const data = z.object({ currentPassword: z.string(), newPassword: z.string().min(10).max(128) }).parse(req.body);
    const u = await User.findById(req.auth!.user._id).select('+passwordHash');
    if (!u || !(await argon2.verify(u.passwordHash, data.currentPassword)))
        throw bad('Current password is incorrect.', 400);
    await User.updateOne({ _id: u._id }, { $set: { passwordHash: await argon2.hash(data.newPassword, { type: argon2.argon2id }) } });
    await Session.deleteMany({ userId: u._id, _id: { $ne: req.auth!.session._id } });
    res.json({ ok: true });
}));
router.post('/forgot-password', asyncWrap(async (req, res) => {
    const { email } = z.object({ email: z.string().email().transform(x => x.toLowerCase()) }).parse(req.body);
    const u = await User.findOne({ email });
    let devLink;
    if (u) {
        try {
            const result = await issueToken(u, 'reset', clientOriginForRequest(req.get('origin')));
            devLink = result.developmentLink;
        }
        catch (e) {
            console.error('Password reset delivery failed', e);
        }
    }
    res.json({ message: 'If an account exists, a reset link has been sent.', ...(devLink ? { developmentLink: devLink } : {}) });
}));
router.post('/reset-password', asyncWrap(async (req, res) => {
    const { token, password } = z.object({ token: z.string().min(32), password: z.string().min(10).max(128) }).parse(req.body);
    const t = await Token.findOneAndUpdate({ tokenHash: hash(token), kind: 'reset', used: false, expiresAt: { $gt: new Date() } }, { $set: { used: true } });
    if (!t)
        throw bad('Reset link is invalid or expired.', 400);
    await User.updateOne({ _id: t.userId }, { $set: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
    await Session.deleteMany({ userId: t.userId });
    res.json({ ok: true });
}));
router.post('/verify-email', asyncWrap(async (req, res) => {
    const { token } = z.object({ token: z.string().min(32) }).parse(req.body);
    const t = await Token.findOneAndUpdate({ tokenHash: hash(token), kind: 'verify', used: false, expiresAt: { $gt: new Date() } }, { $set: { used: true } });
    if (!t)
        throw bad('Verification link is invalid or expired.', 400);
    await User.updateOne({ _id: t.userId }, { $set: { verified: true } });
    res.json({ ok: true });
}));
router.post('/resend-verification', requireAuth, requireCsrf, asyncWrap(async (req, res) => {
    if (req.auth!.user.verified)
        return res.json({ sent: true, message: 'Email already verified.' });
    const r = await issueToken(req.auth!.user, 'verify', clientOriginForRequest(req.get('origin')));
    res.json(r);
}));
export default router;

