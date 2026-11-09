import { Router } from 'express';
import { z } from 'zod';
import { User, Account, Transaction, Goal, Payment, Ticket, Audit, Reconciliation, Journal } from '../models/index.js';
import { asyncWrap, bad, userDTO } from '../lib/util.js';
import { requireAuth, requireAdmin, requireCsrf } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requireAdmin);
const audited = async (userId: any, action: string, targetId: string, details: any, ip: any) => Audit.create({ actorId: userId, action, targetId, details, ip });
router.get('/overview', asyncWrap(async (_req, res) => {
    const [users, activeUsers, transactions, pendingPayments, failedPayments, totalBalances, latest, growth] = await Promise.all([
        User.countDocuments({ role: 'customer' }), User.countDocuments({ role: 'customer', status: 'active' }), Transaction.countDocuments(), Payment.countDocuments({ status: 'pending' }), Payment.countDocuments({ status: 'failed' }), Account.aggregate([{ $match: { kind: { $in: ['wallet', 'savings'] } } }, { $group: { _id: null, total: { $sum: '$balanceMinor' } } }]), Transaction.find().sort({ createdAt: -1 }).limit(7).lean(), User.find({ role: 'customer' }).sort({ createdAt: -1 }).select('name createdAt').limit(7).lean()
    ]);
    const volume = await Transaction.aggregate([{ $match: { status: 'success', kind: { $in: ['transfer', 'funding'] } } }, { $group: { _id: null, total: { $sum: '$amountMinor' } } }]);
    res.json({ users, activeUsers, transactions, pendingPayments, failedPayments, totalLiabilitiesMinor: totalBalances[0]?.total || 0, transactionVolumeMinor: volume[0]?.total || 0, latest, growth });
}));
router.get('/users', asyncWrap(async (req, res) => {
    const search = z.string().max(90).parse(req.query.search || '');
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const q: any = { role: 'customer' };
    if (search)
        q.$or = [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }];
    res.json((await User.find(q).sort({ createdAt: -1 }).limit(100)).map(userDTO));
}));
router.patch('/users/:id/status', requireCsrf, asyncWrap(async (req, res) => {
    const { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
    const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'customer' }, { $set: { status } }, { new: true });
    if (!u)
        throw bad('User not found', 404);
    if (status === 'suspended') {
        const { Session } = await import('../models/index.js');
        await Session.deleteMany({ userId: u._id });
    }
    await audited(req.auth!.user._id, 'user.status', String(u._id), { status }, req.ip);
    res.json(userDTO(u));
}));
router.patch('/users/:id/kyc', requireCsrf, asyncWrap(async (req, res) => {
    const { kycStatus, reason } = z.object({ kycStatus: z.enum(['not_started', 'pending', 'more_info', 'verified', 'rejected']), reason: z.string().min(5).max(500) }).parse(req.body);
    if (kycStatus === 'verified')
        throw bad('KYC verified requires approved external verification or authorized evidence review; automatic verification is disabled.', 403);
    const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'customer' }, { $set: { kycStatus } }, { new: true });
    if (!u)
        throw bad('User not found', 404);
    await audited(req.auth!.user._id, 'user.kyc', String(u._id), { kycStatus, reason }, req.ip);
    res.json(userDTO(u));
}));
router.get('/transactions', asyncWrap(async (_req, res) => { res.json(await Transaction.find().sort({ createdAt: -1 }).limit(120).populate('senderId', 'name email').populate('recipientId', 'name email').lean()); }));
router.get('/wallets', asyncWrap(async (_req, res) => { res.json(await Account.find({ kind: 'wallet' }).populate('ownerId', 'name email').sort({ updatedAt: -1 }).limit(100).lean()); }));
router.get('/payments', asyncWrap(async (_req, res) => { res.json(await Payment.find().sort({ createdAt: -1 }).limit(100).populate('userId', 'name email').lean()); }));
router.get('/goals', asyncWrap(async (_req, res) => { res.json(await Goal.find().populate('ownerId', 'name email').sort({ createdAt: -1 }).limit(100).lean()); }));
router.get('/tickets', asyncWrap(async (_req, res) => { res.json(await Ticket.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(100).lean()); }));
router.patch('/tickets/:id', requireCsrf, asyncWrap(async (req, res) => {
    const d = z.object({ status: z.enum(['open', 'in_progress', 'resolved']), reply: z.string().max(1000).default('') }).parse(req.body);
    const t = await Ticket.findByIdAndUpdate(req.params.id, { $set: d }, { new: true });
    if (!t)
        throw bad('Ticket not found', 404);
    await audited(req.auth!.user._id, 'support.updated', String(t._id), { status: d.status }, req.ip);
    res.json(t);
}));
router.get('/audit', asyncWrap(async (_req, res) => { res.json(await Audit.find().sort({ createdAt: -1 }).limit(100).populate('actorId', 'name email').lean()); }));
router.get('/reconciliation', asyncWrap(async (_req, res) => {
    const [items, counts] = await Promise.all([Reconciliation.find().sort({ createdAt: -1 }).limit(60).lean(), Promise.all([Journal.countDocuments(), Transaction.countDocuments({ journalId: { $exists: true } })])]);
    res.json({ items, postedJournals: counts[0], linkedTransactions: counts[1], note: 'Reconciliation requires comparison against provider settlement reports. Counts alone do not confirm external settlement.' });
}));
router.get('/settings', asyncWrap(async (_req, res) => { res.json({ mode: 'test', currency: 'NGN', realMoneyEnabled: false, externalTransfersEnabled: false, cardIssuanceEnabled: false }); }));
export default router;

