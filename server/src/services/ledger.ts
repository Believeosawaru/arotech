import mongoose, { type ClientSession } from 'mongoose';
import { Account, Journal, Transaction, Notification } from '../models/index.js';
import { bad, ref } from '../lib/util.js';
// Customer wallet and savings accounts are credit-normal liabilities. Clearing is a debit-normal asset.
// Every journal is balanced and committed in the SAME MongoDB transaction as its account mutations.
export async function withLedgerTx<T>(fn: (s: ClientSession) => Promise<T>): Promise<T> {
    for (let tries = 0; tries < 3; tries++) {
        const session = await mongoose.startSession();
        try {
            let out!: T;
            await session.withTransaction(async () => { out = await fn(session); }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
            return out;
        }
        catch (e: any) {
            if (tries < 2 && (e.hasErrorLabel?.('TransientTransactionError') || e.code === 112))
                continue;
            throw e;
        }
        finally {
            await session.endSession();
        }
    }
    throw bad('Transfer unavailable, please retry.', 503);
}
export async function getOrCreateWallet(userId: any, s: ClientSession) {
    let wallet = await Account.findOne({ ownerId: userId, kind: 'wallet' }).session(s);
    if (!wallet) {
        const a = await Account.create([{ ownerId: userId, kind: 'wallet', normalSide: 'credit' }], { session: s });
        wallet = a[0];
    }
    return wallet;
}
export async function getClearing(s: ClientSession) {
    let a = await Account.findOne({ kind: 'clearing', ownerId: null }).session(s);
    if (!a) {
        try {
            [a] = await Account.create([{ kind: 'clearing', ownerId: null, normalSide: 'debit' }], { session: s });
        }
        catch (e: any) {
            if (e.code !== 11000)
                throw e;
            a = await Account.findOne({ kind: 'clearing', ownerId: null }).session(s) as any;
        }
    }
    if (!a)
        throw bad('Clearing account unavailable.', 503);
    return a;
}
export function validateLines(lines: Array<{
    accountId: any;
    debitMinor: number;
    creditMinor: number;
}>) {
    if (lines.length < 2)
        throw bad('A journal must contain at least two lines.');
    let debit = 0, credit = 0;
    for (const l of lines) {
        if (!Number.isSafeInteger(l.debitMinor) || !Number.isSafeInteger(l.creditMinor) || l.debitMinor < 0 || l.creditMinor < 0 || (l.debitMinor > 0 && l.creditMinor > 0) || (l.debitMinor === 0 && l.creditMinor === 0))
            throw bad('Invalid ledger line.');
        debit += l.debitMinor;
        credit += l.creditMinor;
    }
    if (!Number.isSafeInteger(debit) || debit !== credit || debit <= 0)
        throw bad('Unbalanced journal.');
    return true;
}
export async function post(s: ClientSession, kind: string, reference: string, lines: Array<{
    accountId: any;
    debitMinor: number;
    creditMinor: number;
}>, description = '') {
    validateLines(lines);
    for (const l of lines) {
        const account = await Account.findById(l.accountId).session(s);
        if (!account)
            throw bad('Ledger account missing.', 500);
        const delta = account.normalSide === 'credit' ? l.creditMinor - l.debitMinor : l.debitMinor - l.creditMinor;
        const filter: any = { _id: account._id };
        if (delta < 0)
            filter.balanceMinor = { $gte: -delta };
        const result = await Account.updateOne(filter, { $inc: { balanceMinor: delta } }, { session: s });
        if (result.modifiedCount !== 1)
            throw bad('Insufficient funds or conflicting transaction.', 409);
    }
    const [j] = await Journal.create([{ kind, reference, lines, description }], { session: s });
    return j;
}
export async function transfer(sender: any, recipient: any, amountMinor: number, description: string, key: string) {
    return withLedgerTx(async (s) => {
        const existing = await Transaction.findOne({ senderId: sender, idempotencyKey: key, kind: 'transfer' }).session(s);
        if (existing) {
            if (String(existing.recipientId) !== String(recipient) || existing.amountMinor !== amountMinor || existing.description !== description)
                throw bad('Idempotency key was already used for another transfer.', 409);
            return existing;
        }
        if (String(sender) === String(recipient))
            throw bad('You cannot send money to yourself.');
        const from = await getOrCreateWallet(sender, s), to = await getOrCreateWallet(recipient, s), reference = ref('TRF');
        const journal = await post(s, 'transfer', reference, [{ accountId: from._id, debitMinor: amountMinor, creditMinor: 0 }, { accountId: to._id, debitMinor: 0, creditMinor: amountMinor }], description);
        const [tx] = await Transaction.create([{ kind: 'transfer', senderId: sender, recipientId: recipient, ownerIds: [sender, recipient], amountMinor, description, reference, journalId: journal._id, idempotencyKey: key, category: 'Transfers' }], { session: s });
        await Notification.create([{ userId: recipient, title: 'Money received', message: `You received a sandbox transfer of ₦${(amountMinor / 100).toLocaleString('en-NG')}.` }], { session: s });
        return tx;
    });
}
export async function fund(userId: any, amountMinor: number, kind: 'funding' | 'sandbox_credit', externalRef: string) {
    return withLedgerTx(async (s) => {
        const existing = await Transaction.findOne({ reference: externalRef }).session(s);
        if (existing)
            return existing;
        const wallet = await getOrCreateWallet(userId, s);
        const clearing = await getClearing(s);
        const journal = await post(s, kind, externalRef, [{ accountId: clearing._id, debitMinor: amountMinor, creditMinor: 0 }, { accountId: wallet._id, debitMinor: 0, creditMinor: amountMinor }], kind === 'funding' ? 'Verified Paystack test funding' : 'Sandbox faucet credit');
        const [tx] = await Transaction.create([{ kind, recipientId: userId, ownerIds: [userId], amountMinor, reference: externalRef, journalId: journal._id, description: kind === 'funding' ? 'Wallet funded with Paystack TEST payment' : 'Sandbox credit', category: 'Funding' }], { session: s });
        return tx;
    });
}
export async function savingsMove(userId: any, goal: any, amountMinor: number, direction: 'in' | 'out') {
    return withLedgerTx(async (s) => {
        const wallet = await getOrCreateWallet(userId, s);
        const target = await Account.findOne({ _id: goal.accountId, ownerId: userId, kind: 'savings' }).session(s);
        if (!target)
            throw bad('Savings account missing.', 404);
        const a = direction === 'in' ? wallet : target, b = direction === 'in' ? target : wallet;
        const reference = ref('SVG');
        const journal = await post(s, direction === 'in' ? 'savings_in' : 'savings_out', reference, [{ accountId: a._id, debitMinor: amountMinor, creditMinor: 0 }, { accountId: b._id, debitMinor: 0, creditMinor: amountMinor }], `Savings ${direction}`);
        const { Goal } = await import('../models/index.js');
        const change = direction === 'in' ? amountMinor : -amountMinor;
        const filter: any = { _id: goal._id, ownerId: userId, status: 'active' };
        if (direction === 'out')
            filter.savedMinor = { $gte: amountMinor };
        const update = await Goal.updateOne(filter, { $inc: { savedMinor: change } }, { session: s });
        if (update.modifiedCount !== 1)
            throw bad('Goal funds unavailable.', 409);
        const [tx] = await Transaction.create([{ kind: direction === 'in' ? 'savings_in' : 'savings_out', senderId: userId, recipientId: userId, ownerIds: [userId], amountMinor, reference, journalId: journal._id, description: `${goal.name} savings ${direction}`, category: 'Savings' }], { session: s });
        return tx;
    });
}

