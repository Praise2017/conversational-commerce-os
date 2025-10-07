import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const auth = req.header('authorization') || req.header('Authorization');
  if (!auth) return next();
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const decoded = jwt.verify(parts[1], secret);
      req.user = decoded;
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const auth = req.header('authorization') || req.header('Authorization');
  if (!auth) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const parts = auth.split(' ');
  if (!(parts.length === 2 && parts[0].toLowerCase() === 'bearer')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(parts[1], secret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}
