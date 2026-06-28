import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten(),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }

  console.error(`[error] ${req.method} ${req.path}:`, err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
