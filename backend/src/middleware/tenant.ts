import { Request, Response, NextFunction } from 'express';

export function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  const ws = req.header('x-workspace-id');
  if (!ws) return res.status(400).json({ error: 'MISSING_WORKSPACE_ID', message: 'Provide x-workspace-id header' });
  req.workspaceId = ws;
  next();
}
