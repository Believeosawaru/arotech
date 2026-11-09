import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Payment, User } from '../models/index.js';
import { asyncWrap, bad, ref } from '../lib/util.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { fund } from '../services/ledger.js';
import { env } from '../config.js';
import { clientOriginForRequest } from '../lib/origin.js';
const router = Router();
const base = 'https://api.paystack.co';
async function paystack(path: string, body?: unknown) {
    if (!env.PAYSTACK_SECRET_KEY)
        throw bad('Paystack TEST key is not configured. Use sandbox credit instead.', 503);
    const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const j: any = await r.json();
    if (!r.ok || !j.status)
        throw bad('Payment provider could not complete this request.', 502);
    return j.data;
}
async function confirm(reference: string) {
    const p = await Payment.findOne({ reference });
    if (!p)
        throw bad('Payment intent not found.', 404);
    if (p.status === 'success')
        return p;
    const verified = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (verified.reference !== reference || verified.status !== 'success' || verified.currency !== 'NGN' || verified.amount !== p.amountMinor)
        return p;
    // Funding is idempotent on the unique reference; only a verified provider response can get here.
    // The ledger write is committed before the intent is marked successful; retries recover safely.
    await fund(p.userId, p.amountMinor, 'funding', p.reference);
    await Payment.updateOne({ _id: p._id, status: 'pending' }, { $set: { status: 'success', providerResponse: { reference: verified.reference, status: verified.status } } });
    return Payment.findById(p._id);
}
router.post('/initialize', requireAuth, requireCsrf, asyncWrap(async (req, res) => {
    const { amountMinor } = z.object({ amountMinor: z.number().int().min(10000).max(100000000) }).parse(req.body);
    const reference = ref('PAY');
    const u = await User.findById(req.auth!.user._id);
    if (!u)
        throw bad('Account not found.', 404);
    const data = await paystack('/transaction/initialize', { email: u.email, amount: amountMinor, currency: 'NGN', reference, callback_url: `${clientOriginForRequest(req.get('origin'))}/app/fund?reference=${encodeURIComponent(reference)}` });
    await Payment.create({ reference, userId: u._id, amountMinor });
    res.status(201).json({ reference, authorizationUrl: data.authorization_url, sandbox: true });
}));
router.get('/verify/:reference', requireAuth, asyncWrap(async (req, res) => {
    const p = await Payment.findOne({ reference: req.params.reference, userId: req.auth!.user._id });
    if (!p)
        throw bad('Payment not found.', 404);
    const result = await confirm(p.reference);
    res.json({ reference: p.reference, status: result?.status || 'pending' });
}));
router.get('/history', requireAuth, asyncWrap(async (req, res) => { res.json(await Payment.find({ userId: req.auth!.user._id }).sort({ createdAt: -1 }).limit(50).lean()); }));
// POST /api/payments/webhook must use raw body to validate x-paystack-signature.
router.post('/webhook', asyncWrap(async (req, res) => {
    if (!env.PAYSTACK_SECRET_KEY)
        return res.status(503).json({ error: 'Provider not configured' });
    if (!req.rawBody)
        throw bad('Missing raw webhook body', 400);
    const provided = String(req.headers['x-paystack-signature'] || '');
    const expected = createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(req.rawBody).digest('hex');
    if (provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected)))
        throw bad('Invalid webhook signature', 401);
    const event = req.body;
    if (event.event === 'charge.success' && typeof event.data?.reference === 'string') {
        // Verify independently with Paystack before crediting. Do not rely on event contents alone.
        const reference = event.data.reference;
        const p = await Payment.findOne({ reference });
        if (p)
            await confirm(reference);
    }
    res.json({ received: true });
}));
export default router;

