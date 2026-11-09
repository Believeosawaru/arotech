import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config.js';
import { isAllowedOrigin } from './lib/origin.js';
import { optionalAuth } from './middleware/auth.js';
import { bad, errorHandler } from './lib/util.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import supportRoutes from './routes/support.js';

const app = express();

app.disable('x-powered-by');

app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => callback(null, origin && isAllowedOrigin(origin) ? origin : false),
  credentials: true
}));

// Validate the origin for ANY unsafe request, in addition to authenticated CSRF tokens.
app.use((req, res, next) => { if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/api/payments/webhook')
    return next(); const origin = req.get('origin'); if (origin && !isAllowedOrigin(origin))
    return next(bad('Origin not permitted.', 403)); next(); });
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.json({ limit: '128kb', verify: (req: any, _res, buf) => { if (req.url.startsWith('/api/payments/webhook'))
        req.rawBody = Buffer.from(buf); } }));
app.use(cookieParser());
app.get('/api/health', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded', mode: 'test', db: mongoose.connection.readyState === 1 }));
app.use(optionalAuth);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use((_req, _res, next) => next(bad('API route not found', 404)));
app.use(errorHandler);

async function start() { await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }); console.log('MongoDB connected'); app.listen(env.PORT, () => console.log(`AROTECH API listening on ${env.PORT} (TEST MODE ONLY)`)); }
start().catch(e => { console.error('Startup failed:', e); process.exit(1); });

