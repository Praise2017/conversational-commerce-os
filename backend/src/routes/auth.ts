import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const TokenInput = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  workspace_id: z.string().min(1)
});

router.post('/token', (req, res) => {
  const parse = TokenInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });

  const { client_id, client_secret, workspace_id } = parse.data;
  // MVP: accept any non-empty values; in production validate against DB/Secrets
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign(
    { sub: client_id, workspace_id, scope: ['api:read', 'api:write'] },
    secret,
    { algorithm: 'HS256', expiresIn: '1h', issuer: 'praisepoint' }
  );
  res.json({ access_token: token, token_type: 'Bearer', expires_in: 3600 });
});

export default router;
