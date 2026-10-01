import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, requireAdmin } from '../http.js';

const router = Router();

const CATEGORIES = [
  'electronics',
  'wallet',
  'id-card',
  'documents',
  'keys',
  'bags',
  'jewellery',
  'clothing',
  'books',
  'other',
];

const questionSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(200),
});

const createItemSchema = z.object({
  title: z.string().trim().min(1).max(150),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(1).max(2000),
  locationFound: z.string().trim().min(1).max(150),
  dateFound: z.coerce.date(),
  questions: z.array(questionSchema).min(1),
});

const updateItemSchema = createItemSchema.partial();

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      cb(
        null,
        crypto.randomBytes(8).toString('hex') + path.extname(file.originalname).toLowerCase(),
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!ok) return cb(new HttpError(400, 'Image must be jpg, png or webp'));
    cb(null, true);
  },
});

router.use(requireAdmin);

router.post('/', async (req, res) => {
  const result = createItemSchema.safeParse(req.body);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { questions, ...item } = result.data;

  const created = await prisma.item.create({
    data: { ...item, addedById: req.session.user.id, questions: { create: questions } },
    include: { questions: true },
  });
  res.status(201).json({ success: true, data: created });
});

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { questions: true } } },
    }),
    prisma.item.count(),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map(({ _count, ...i }) => ({ ...i, questionCount: _count.questions })),
      page,
      limit,
      total,
    },
  });
});

router.get('/:id', async (req, res) => {
  const item = await prisma.item.findUnique({
    where: { id: Number(req.params.id) },
    include: { questions: true },
  });
  if (!item) throw new HttpError(404, 'Item not found');
  res.json({ success: true, data: item });
});

router.patch('/:id', async (req, res) => {
  const result = updateItemSchema.safeParse(req.body);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { questions, ...item } = result.data;
  const id = Number(req.params.id);

  if (questions) {
    const claimCount = await prisma.claim.count({ where: { itemId: id } });
    if (claimCount > 0) {
      throw new HttpError(409, 'Cannot change questions: this item already has claims');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (questions) {
      await tx.secretQuestion.deleteMany({ where: { itemId: id } });
    }
    return tx.item.update({
      where: { id },
      data: { ...item, ...(questions ? { questions: { create: questions } } : {}) },
      include: { questions: true },
    });
  });
  res.json({ success: true, data: updated });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, 'Item not found');
  if (item.status === 'claimed') throw new HttpError(409, 'Cannot delete a claimed item');

  // Claim.item is onDelete: NoAction (see schema.prisma), so claims (and their
  // answers, via cascade) must be removed explicitly before the item.
  await prisma.$transaction([
    prisma.claim.deleteMany({ where: { itemId: id } }),
    prisma.item.delete({ where: { id } }),
  ]);
  if (item.imagePath) await fs.unlink(item.imagePath).catch(() => {});
  res.json({ success: true });
});

router.post('/:id/image', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  if (!req.file) throw new HttpError(400, 'No image file provided');

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new HttpError(404, 'Item not found');
  }

  const updated = await prisma.item.update({
    where: { id },
    data: { imagePath: req.file.path.replace(/\\/g, '/') },
  });
  if (item.imagePath) await fs.unlink(item.imagePath).catch(() => {});
  res.json({ success: true, data: updated });
});

export default router;
