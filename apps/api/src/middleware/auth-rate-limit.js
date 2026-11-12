import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const shared = {
  standardHeaders: true,
  legacyHeaders: false,
  // The application sets one explicit trusted-proxy hop. The limiter is not
  // allowed to infer arbitrary client-controlled forwarding chains.
  validate: { trustProxy: false },
};

export const authSendEmailRateLimit = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 12,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip || '')}:${String(req.body?.email || req.body?.email_data?.email || req.body?.user?.email || '').trim().toLowerCase()}`,
  message: { error: 'Too many verification requests. Wait a few minutes and try again.' },
});

export const publicAuthRateLimit = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Too many authentication attempts. Wait a few minutes and try again.' },
});

export const publicWriteRateLimit = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: { error: 'Too many requests. Wait a few minutes and try again.' },
});
