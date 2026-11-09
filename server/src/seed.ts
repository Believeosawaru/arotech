import 'dotenv/config';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { env } from './config.js';
import { User, Account, Card, Goal } from './models/index.js';
import { fund, transfer, savingsMove } from './services/ledger.js';
async function seed() {
    if (env.APP_MODE !== 'test')
        throw Error('Seed is allowed only in test mode');
    if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_CUSTOMER_PASSWORD)
        throw Error('Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD in server/.env before running seed.');
    await mongoose.connect(env.MONGODB_URI);
    const create = async (name: string, email: string, role: 'customer' | 'admin', password: string) => {
        let u = await User.findOne({ email });
        if (u)
            return u;
        u = await User.create({ name, email, role, verified: true, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) });
        if (role === 'customer') {
            await Account.create({ ownerId: u._id, kind: 'wallet', normalSide: 'credit' });
            await Card.create({ ownerId: u._id, label: 'Everyday' });
        }
        return u;
    };
    const admin = await create('Arotech Operations', 'admin@arotech.test', 'admin', process.env.SEED_ADMIN_PASSWORD);
    const ada = await create('Ada Okafor', 'ada@arotech.test', 'customer', process.env.SEED_CUSTOMER_PASSWORD);
    const tayo = await create('Tayo Williams', 'tayo@arotech.test', 'customer', process.env.SEED_CUSTOMER_PASSWORD);
    if (!await Account.findOne({ kind: 'clearing', ownerId: null }))
        await Account.create({ kind: 'clearing', ownerId: null, normalSide: 'debit' });
    const { Transaction } = await import('./models/index.js');
    if (!await Transaction.exists({ ownerIds: ada._id })) {
        await fund(ada._id, 45000000, 'sandbox_credit', 'SEED-ADA-CREDIT');
        await fund(tayo._id, 24000000, 'sandbox_credit', 'SEED-TAYO-CREDIT');
        await transfer(ada._id, tayo._id, 3800000, 'Weekend catch-up', '11111111-1111-4111-8111-111111111111');
        await transfer(tayo._id, ada._id, 1500000, 'Thanks for helping', '22222222-2222-4222-8222-222222222222');
        const a = await Account.create({ ownerId: ada._id, kind: 'savings', normalSide: 'credit' });
        const goal = await Goal.create({ ownerId: ada._id, name: 'Summer in Lagos', targetMinor: 75000000, accountId: a._id });
        await savingsMove(ada._id, goal, 12000000, 'in');
    }
    console.log('Seed complete (SANDBOX ONLY). Login:', admin.email, ada.email, tayo.email, '— use passwords configured in .env');
    await mongoose.disconnect();
}
seed().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });

