import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, requireLogin, requireAdmin } from '../http.js';

const router = Router();

const createClaimSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  ownershipDetails: z.string().trim().min(1).max(2000),
  answers: z.array(
    z.object({
      questionId: z.coerce.number().int().positive(),
      answer: z.string().trim().min(1).max(200),
    }),
  ),
});

const reviewClaimSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().trim().min(1).max(500).optional(),
});

// The claimant's own view: their submitted answers, never the correct ones.
const mineSelect = {
  id: true,
  itemId: true,
  ownershipDetails: true,
  status: true,
  adminNote: true,
  createdAt: true,
  reviewedAt: true,
  item: { select: { id: true, title: true, category: true, status: true } },
  // The question text is not secret (the item detail page already shows it before claiming);
  // only its `answer` is — which is why `question` here selects `question`, never `answer`.
  answers: {
    select: {
      id: true,
      questionId: true,
      answer: true,
      question: { select: { id: true, question: true } },
    },
  },
};

// The admin's review view: submitted answers alongside the correct ones.
const adminSelect = {
  id: true,
  itemId: true,
  ownershipDetails: true,
  status: true,
  adminNote: true,
  createdAt: true,
  reviewedAt: true,
  claimant: { select: { id: true, username: true, name: true } },
  item: { select: { id: true, title: true, category: true, status: true } },
  answers: {
    select: {
      id: true,
      answer: true,
      question: { select: { id: true, question: true, answer: true } },
    },
  },
};

router.post('/', requireLogin, async (req, res) => {
  const result = createClaimSchema.safeParse(req.body);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { itemId, ownershipDetails, answers } = result.data;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { questions: { select: { id: true } } },
  });
  if (!item) throw new HttpError(404, 'Item not found');
  if (item.status !== 'unclaimed') throw new HttpError(409, 'This item has already been claimed');

  const expectedIds = new Set(item.questions.map((q) => q.id));
  const givenIds = new Set(answers.map((a) => a.questionId));
  const sameSet =
    expectedIds.size === givenIds.size && [...expectedIds].every((id) => givenIds.has(id));
  if (!sameSet) throw new HttpError(400, "Answers must cover exactly this item's secret questions");

  const existingPending = await prisma.claim.findFirst({
    where: { itemId, claimantId: req.session.user.id, status: 'pending' },
  });
  if (existingPending) throw new HttpError(409, 'You already have a pending claim for this item');

  const claim = await prisma.claim.create({
    data: {
      itemId,
      claimantId: req.session.user.id,
      ownershipDetails,
      answers: { create: answers },
    },
    select: mineSelect,
  });
  res.status(201).json({ success: true, data: claim });
});

router.get('/mine', requireLogin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const where = { claimantId: req.session.user.id };

  const [items, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      select: mineSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);
  res.json({ success: true, data: { items, page, limit, total } });
});

router.get('/', requireAdmin, async (req, res) => {
  const statusFilter = z
    .enum(['pending', 'approved', 'rejected'])
    .optional()
    .safeParse(req.query.status);
  if (!statusFilter.success) throw new HttpError(400, 'Invalid status filter');

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const where = statusFilter.data ? { status: statusFilter.data } : {};

  const [items, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      select: adminSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.claim.count({ where }),
  ]);
  res.json({ success: true, data: { items, page, limit, total } });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const claim = await prisma.claim.findUnique({
    where: { id: Number(req.params.id) },
    select: adminSelect,
  });
  if (!claim) throw new HttpError(404, 'Claim not found');
  res.json({ success: true, data: claim });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const result = reviewClaimSchema.safeParse(req.body);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { status, adminNote } = result.data;
  const id = Number(req.params.id);

  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) throw new HttpError(404, 'Claim not found');
  if (claim.status !== 'pending') throw new HttpError(409, 'This claim has already been reviewed');

  await prisma.$transaction(async (tx) => {
    await tx.claim.update({
      where: { id },
      data: { status, adminNote, reviewedAt: new Date() },
    });

    if (status === 'approved') {
      await tx.item.update({ where: { id: claim.itemId }, data: { status: 'claimed' } });
      await tx.claim.updateMany({
        where: { itemId: claim.itemId, status: 'pending', id: { not: id } },
        data: {
          status: 'rejected',
          adminNote: 'Another claim was approved for this item',
          reviewedAt: new Date(),
        },
      });
    }
  });

  const updated = await prisma.claim.findUnique({ where: { id }, select: adminSelect });
  res.json({ success: true, data: updated });
});

export default router;
