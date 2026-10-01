import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, requireLogin } from '../http.js';

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

const itemSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  locationFound: true,
  dateFound: true,
  imagePath: true,
  status: true,
  createdAt: true,
};

const searchSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  date: z.coerce.date().optional(), // the date the user lost their item; matched against dateFound
});

router.use(requireLogin);

router.get('/', async (req, res) => {
  const result = searchSchema.safeParse(req.query);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { q, category, date } = result.data;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where = {
    status: 'unclaimed',
    ...(category ? { category } : {}),
    ...(date ? { dateFound: date } : {}),
    ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      select: itemSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  res.json({ success: true, data: { items, page, limit, total } });
});

router.get('/:id', async (req, res) => {
  const item = await prisma.item.findFirst({
    where: { id: Number(req.params.id), status: 'unclaimed' },
    select: { ...itemSelect, questions: { select: { id: true, question: true } } }, // never the answer
  });
  if (!item) throw new HttpError(404, 'Item not found');
  res.json({ success: true, data: item });
});

export default router;
