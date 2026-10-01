import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAdmin } from '../http.js';

const router = Router();

router.use(requireAdmin);

router.get('/users', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true, name: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  res.json({ success: true, data: { items, page, limit, total } });
});

router.get('/stats', async (req, res) => {
  const [itemsUnclaimed, itemsClaimed, claimsPending, claimsApproved, claimsRejected] =
    await Promise.all([
      prisma.item.count({ where: { status: 'unclaimed' } }),
      prisma.item.count({ where: { status: 'claimed' } }),
      prisma.claim.count({ where: { status: 'pending' } }),
      prisma.claim.count({ where: { status: 'approved' } }),
      prisma.claim.count({ where: { status: 'rejected' } }),
    ]);

  res.json({
    success: true,
    data: {
      items: {
        unclaimed: itemsUnclaimed,
        claimed: itemsClaimed,
        total: itemsUnclaimed + itemsClaimed,
      },
      claims: {
        pending: claimsPending,
        approved: claimsApproved,
        rejected: claimsRejected,
        total: claimsPending + claimsApproved + claimsRejected,
      },
    },
  });
});

export default router;
