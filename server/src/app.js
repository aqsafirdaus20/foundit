import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import { env } from './env.js';
import { notFound, errorHandler } from './http.js';
import health from './routes/health.js';
import auth from './routes/auth.js';
import items from './routes/items.js';
import search from './routes/search.js';
import claims from './routes/claims.js';
import admin from './routes/admin.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use('/uploads', express.static('uploads'));
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  // One router per feature, mounted under /api/v1
  app.use('/api/v1/health', health);
  app.use('/api/v1/auth', auth);
  app.use('/api/v1/items', items);
  app.use('/api/v1/search', search);
  app.use('/api/v1/claims', claims);
  app.use('/api/v1/admin', admin);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
