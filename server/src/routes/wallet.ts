import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Account, Beneficiary, User, Transaction, Goal, Card, Notification } from '../models/index.js';
import { asyncWrap, bad, money, ref } from '../lib/util.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { transfer, fund, savingsMove } from '../services/ledger.js';
import { env } from '../config.js';
const router = Router();
router.use(requireAuth);
const amountSchema = z.number().int().refine(money, 'Amount must be between ₦1 and ₦1,000,000');
const myId = (req: any) => req.auth.user._id;
router.get('/overview', asyncWrap(async (req, res) => {
    const uid = myId(req);
    const [wallet, goals, transactions, beneficiaries, unread] = await Promise.all([
        Account.findOne({ ownerId: uid, kind: 'wallet' }).lean(), Goal.find({ ownerId: uid, status: { $ne: 'closed' } }).sort({ createdAt: -1 }).limit(6).lean(),
        Transaction.find({ ownerIds: uid }).sort({ createdAt: -1 }).limit(7).lean(), Beneficiary.find({ ownerId: uid }).populate('userId', 'name email').limit(6).lean(), Notification.countDocuments({ userId: uid, read: false })
    ]);
    res.json({ balanceMinor: wallet?.balanceMinor ?? 0, goals, transactions, beneficiaries, unread, sandbox: true, currency: 'NGN' });
}));
router.get('/balance', asyncWrap(async (req, res) => { const a = await Account.findOne({ ownerId: myId(req), kind: 'wallet' }); res.json({ balanceMinor: a?.balanceMinor ?? 0, currency: 'NGN', sandbox: true }); }));
router.get('/recipients', asyncWrap(async (req, res) => {
    const q = z.string().min(2).max(80).parse(req.query.q || '');
    const users = await User.find({ role: 'customer', status: 'active', _id: { $ne: myId(req) }, $or: [{ email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] }).select('name email').limit(8).lean();
    res.json(users.map(u => ({ id: String(u._id), name: u.name, email: u.email })));
}));
router.post('/transfer', requireCsrf, asyncWrap(async (req, res) => {
    const { recipientId, amountMinor, description, idempotencyKey } = z.object({ recipientId: z.string().refine(mongoose.isValidObjectId), amountMinor: amountSchema, description: z.string().max(140).default(''), idempotencyKey: z.string().uuid() }).parse(req.body);
    const recipient = await User.findOne({ _id: recipientId, role: 'customer', status: 'active' });
    if (!recipient)
        throw bad('Recipient not found.', 404);
    try {
        res.status(201).json(await transfer(myId(req), recipient._id, amountMinor, description, idempotencyKey));
    }
    catch (e: any) {
        if (e.code === 11000) {
            const existing = await Transaction.findOne({ senderId: myId(req), idempotencyKey, kind: 'transfer' });
            if (existing)
                return res.json(existing);
        }
        throw e;
    }
}));
router.get('/transactions', asyncWrap(async (req, res) => {
    const q = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(15), type: z.string().optional(), status: z.string().optional(), search: z.string().max(80).optional(), from: z.string().optional(), to: z.string().optional() }).parse(req.query);
    const where: any = { ownerIds: myId(req) };
    if (q.type && q.type !== 'all')
        where.kind = q.type;
    if (q.status && q.status !== 'all')
        where.status = q.status;
    if (q.search)
        where.$or = [{ reference: { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { description: { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }];
    if (q.from || q.to) {
        where.createdAt = {};
        if (q.from) {
            const d = new Date(q.from);
            if (Number.isNaN(d.getTime()))
                throw bad('Invalid from date');
            where.createdAt.$gte = d;
        }
        if (q.to) {
            const d = new Date(q.to + 'T23:59:59.999Z');
            if (Number.isNaN(d.getTime()))
                throw bad('Invalid to date');
            where.createdAt.$lte = d;
        }
    }
    const [items, total] = await Promise.all([Transaction.find(where).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Transaction.countDocuments(where)]);
    res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
}));
router.patch('/transactions/:id/category', requireCsrf, asyncWrap(async (req, res) => {
    const { category } = z.object({ category: z.enum(['Shopping', 'Bills', 'Food', 'Transport', 'Health', 'Subscriptions', 'Transfers', 'Savings', 'Funding', 'Other']) }).parse(req.body);
    const r = await Transaction.findOneAndUpdate({ _id: req.params.id, ownerIds: myId(req) }, { $set: { category } }, { new: true });
    if (!r)
        throw bad('Not found', 404);
    res.json(r);
}));
router.get('/beneficiaries', asyncWrap(async (req, res) => { res.json(await Beneficiary.find({ ownerId: myId(req) }).populate('userId', 'name email').sort({ createdAt: -1 }).lean()); }));
router.post('/beneficiaries', requireCsrf, asyncWrap(async (req, res) => {
    const d = z.object({ userId: z.string().refine(mongoose.isValidObjectId), nickname: z.string().max(50).default('') }).parse(req.body);
    if (d.userId === String(myId(req)))
        throw bad('Cannot add yourself');
    if (!await User.exists({ _id: d.userId, role: 'customer' }))
        throw bad('Recipient not found.', 404);
    const b = await Beneficiary.findOneAndUpdate({ ownerId: myId(req), userId: d.userId }, { $set: { nickname: d.nickname } }, { upsert: true, new: true });
    res.status(201).json(b);
}));
router.delete('/beneficiaries/:id', requireCsrf, asyncWrap(async (req, res) => { await Beneficiary.deleteOne({ _id: req.params.id, ownerId: myId(req) }); res.json({ ok: true }); }));
router.get('/goals', asyncWrap(async (req, res) => { res.json(await Goal.find({ ownerId: myId(req) }).sort({ createdAt: -1 }).lean()); }));
router.post('/goals', requireCsrf, asyncWrap(async (req, res) => {
    const d = z.object({ name: z.string().trim().min(2).max(80), targetMinor: amountSchema, deadline: z.string().optional() }).parse(req.body);
    const a = await Account.create({ ownerId: myId(req), kind: 'savings', normalSide: 'credit' });
    const g = await Goal.create({ ownerId: myId(req), name: d.name, targetMinor: d.targetMinor, deadline: d.deadline ? new Date(d.deadline) : undefined, accountId: a._id });
    res.status(201).json(g);
}));
router.post('/goals/:id/move', requireCsrf, asyncWrap(async (req, res) => {
    const d = z.object({ amountMinor: amountSchema, direction: z.enum(['in', 'out']) }).parse(req.body);
    const goal = await Goal.findOne({ _id: req.params.id, ownerId: myId(req), status: 'active' });
    if (!goal)
        throw bad('Active goal not found.', 404);
    res.status(201).json(await savingsMove(myId(req), goal, d.amountMinor, d.direction));
}));
router.post('/goals/:id/close', requireCsrf, asyncWrap(async (req, res) => {
    const goal = await Goal.findOne({ _id: req.params.id, ownerId: myId(req), status: 'active' });
    if (!goal)
        throw bad('Active goal not found.', 404);
    if (goal.savedMinor > 0)
        throw bad('Move funds back to your wallet before closing the goal.', 409);
    goal.status = 'closed';
    await goal.save();
    res.json({ ok: true });
}));
router.post('/kyc/request', requireCsrf, asyncWrap(async (req, res) => {
    const status = req.auth!.user.kycStatus;
    if (!['not_started', 'more_info', 'rejected'].includes(status))
        throw bad('Review already pending or complete.', 409);
    const updated = await User.findOneAndUpdate({ _id: myId(req), kycStatus: { $in: ['not_started', 'more_info', 'rejected'] } }, { $set: { kycStatus: 'pending' } }, { new: true });
    if (!updated)
        throw bad('Review state changed. Refresh and retry.', 409);
    res.json({ kycStatus: 'pending', message: 'Your review request was recorded. This does not verify your identity.' });
}));
router.get('/cards', asyncWrap(async (req, res) => { res.json(await Card.find({ ownerId: myId(req) }).lean()); }));
router.patch('/cards/:id', requireCsrf, asyncWrap(async (req, res) => {
    const d = z.object({ label: z.string().trim().min(1).max(40).optional(), status: z.enum(['active', 'frozen']).optional() }).parse(req.body);
    const result = await Card.findOneAndUpdate({ _id: req.params.id, ownerId: myId(req) }, { $set: d }, { new: true });
    if (!result)
        throw bad('Card not found.', 404);
    res.json(result);
}));
router.get('/notifications', asyncWrap(async (req, res) => { res.json(await Notification.find({ userId: myId(req) }).sort({ createdAt: -1 }).limit(40).lean()); }));
router.post('/notifications/read', requireCsrf, asyncWrap(async (req, res) => { await Notification.updateMany({ userId: myId(req), read: false }, { $set: { read: true } }); res.json({ ok: true }); }));
router.get('/insights', asyncWrap(async (req, res) => {
    const txs = await Transaction.find({ ownerIds: myId(req) }).sort({ createdAt: -1 }).limit(500).lean();
    const months: Record<string, {
        month: string;
        in: number;
        out: number;
    }> = {};
    const cats: Record<string, number> = {};
    let received = 0, sent = 0;
    for (const t of txs) {
        const k = new Date(t.createdAt).toISOString().slice(0, 7);
        months[k] ??= { month: k, in: 0, out: 0 };
        const incoming = (t.kind === 'funding' || t.kind === 'sandbox_credit' || t.kind === 'transfer' && String(t.recipientId) === String(myId(req)));
        const outgoing = t.kind === 'transfer' && String(t.senderId) === String(myId(req));
        if (incoming) {
            months[k].in += t.amountMinor;
            received += t.amountMinor;
        }
        if (outgoing) {
            months[k].out += t.amountMinor;
            sent += t.amountMinor;
            cats[t.category || 'Transfers'] = (cats[t.category || 'Transfers'] || 0) + t.amountMinor;
        }
    }
    res.json({ monthly: Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12), categories: Object.entries(cats).map(([name, value]) => ({ name, value })), receivedMinor: received, sentMinor: sent, transactions: txs.length });
}));
router.post('/sandbox-credit', requireCsrf, asyncWrap(async (req, res) => {
    if (env.APP_MODE !== 'test' || env.ENABLE_SANDBOX_FAUCET !== 'true')
        throw bad('Sandbox credit disabled.', 403);
    const count = await User.findOneAndUpdate({ _id: myId(req), sandboxCredits: { $lt: 3 } }, { $inc: { sandboxCredits: 1 } }, { new: true });
    if (!count)
        throw bad('Sandbox credit limit reached (3 grants).', 429);
    try {
        res.status(201).json(await fund(myId(req), 25000000, 'sandbox_credit', ref('TEST')));
    }
    catch (e) {
        await User.updateOne({ _id: myId(req) }, { $inc: { sandboxCredits: -1 } });
        throw e;
    }
}));
export default router;

