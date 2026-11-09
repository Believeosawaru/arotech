import { Router } from 'express';
import { z } from 'zod';
import { Ticket } from '../models/index.js';
import { asyncWrap } from '../lib/util.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
router.get('/', asyncWrap(async (req, res) => { res.json(await Ticket.find({ userId: req.auth!.user._id }).sort({ createdAt: -1 }).lean()); }));
router.post('/', requireCsrf, asyncWrap(async (req, res) => { const d = z.object({ subject: z.string().trim().min(3).max(100), message: z.string().trim().min(10).max(3000) }).parse(req.body); res.status(201).json(await Ticket.create({ ...d, userId: req.auth!.user._id })); }));
export default router;

