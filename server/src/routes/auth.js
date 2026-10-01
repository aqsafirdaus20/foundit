import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, requireLogin } from '../http.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(100),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20).optional(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { username, password, name, phone } = result.data;

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, name, phone, role: 'user' },
    select: { id: true, username: true, name: true, phone: true, role: true },
  });

  req.session.user = user;
  res.status(201).json({ success: true, data: user });
});

router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) throw new HttpError(400, 'Invalid input', result.error.flatten());
  const { username, password } = result.data;

  const invalid = () => new HttpError(401, 'Invalid username or password');

  const found = await prisma.user.findUnique({ where: { username } });
  if (!found) throw invalid();

  const ok = await bcrypt.compare(password, found.passwordHash);
  if (!ok) throw invalid();

  const user = {
    id: found.id,
    username: found.username,
    name: found.name,
    phone: found.phone,
    role: found.role,
  };
  req.session.user = user;
  res.json({ success: true, data: user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', requireLogin, (req, res) => {
  res.json({ success: true, data: req.session.user });
});

export default router;
