import type { Request, Response, NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';

type OriginDelegate = (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;

export function corsOptionsFromEnv(): CorsOptions {
  const list = (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.includes('*')) {
    return { origin: true };
  }
  const allowed = new Set(list);
  const origin: OriginDelegate = (requestOrigin, callback) => {
    if (!requestOrigin) {
      callback(null, true); // same-origin or curl
      return;
    }
    if (allowed.has(requestOrigin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS_NOT_ALLOWED'), false);
  };
  return {
    origin,
    credentials: true,
  };
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Minimal hardening without helmet dependency
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=()');
  next();
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const perMinute = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '120', 10);
  if (!perMinute || perMinute <= 0) return next();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const minuteMs = 60_000;
  const bucket = buckets.get(ip) || { count: 0, resetAt: now + minuteMs };
  if (now > bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + minuteMs; }
  bucket.count += 1;
  buckets.set(ip, bucket);
  res.setHeader('X-RateLimit-Limit', String(perMinute));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(perMinute - bucket.count, 0)));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(bucket.resetAt / 1000)));
  if (bucket.count > perMinute) {
    return res.status(429).json({ error: 'RATE_LIMIT', retryAfterSec: Math.ceil((bucket.resetAt - now)/1000) });
  }
  next();
}
