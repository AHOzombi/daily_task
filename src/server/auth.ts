import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../types/user';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Set it before starting the server.');
}

const JWT_EXPIRES_IN = '7d';

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET!) as AuthPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未登录，请先登录' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ code: 401, message: 'Token 无效或已过期' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      (req as any).user = payload;
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}
