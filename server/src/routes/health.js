import { Router } from 'express';
import { dbStatus } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', db: await dbStatus(), uptime: Math.round(process.uptime()) },
  });
});

export default router;
