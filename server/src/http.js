import { env } from './env.js';

// Throw from any handler: `throw new HttpError(404, 'Item not found')`.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function requireLogin(req, res, next) {
  if (!req.session.user) throw new HttpError(401, 'Not logged in');
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session.user) throw new HttpError(401, 'Not logged in');
  if (req.session.user.role !== 'admin') throw new HttpError(403, 'Admin access required');
  next();
}

// Express 5 forwards errors thrown in async handlers here automatically.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof HttpError) {
    ({ status, message, details } = err);
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err?.code === 'P2002') {
    status = 409;
    message = 'A record with this value already exists';
  } else if (err?.code === 'P2025') {
    status = 404;
    message = 'Record not found';
  } else if (err?.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : err.message;
  }

  if (status >= 500 && !env.isTest) console.error(err);

  const body = { success: false, message };
  if (details) body.details = details;
  if (status >= 500 && !env.isProd && err?.stack) body.stack = err.stack;
  res.status(status).json(body);
}
