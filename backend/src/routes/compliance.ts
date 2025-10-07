import { Router } from 'express';
import { deleteContactBundle as deleteBundleMem, exportContactBundle as exportBundleMem } from '../storage/db.js';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/complianceRepo.js';

const router = Router();

// GET /v1/compliance/contacts/:id/export
router.get('/contacts/:id/export', (req, res) => {
  const ws = req.workspaceId!;
  const id = req.params.id;
  const pool = getPool();
  if (!pool) {
    const bundle = exportBundleMem(ws, id);
    if (!bundle.contact) return res.status(404).json({ error: 'CONTACT_NOT_FOUND' });
    return res.json(bundle);
  }
  repo.exportContactBundle(ws, id)
    .then((bundle) => {
      if (!bundle.contact) return res.status(404).json({ error: 'CONTACT_NOT_FOUND' });
      res.json(bundle);
    })
    .catch((e: any) => res.status(500).json({ error: 'DB_ERROR', message: e.message }));
});

// DELETE /v1/compliance/contacts/:id
router.delete('/contacts/:id', (req, res) => {
  const ws = req.workspaceId!;
  const id = req.params.id;
  const pool = getPool();
  if (!pool) {
    deleteBundleMem(ws, id);
    return res.json({ ok: true });
  }
  repo.deleteContactBundle(ws, id)
    .then(() => res.json({ ok: true }))
    .catch((e: any) => res.status(500).json({ error: 'DB_ERROR', message: e.message }));
});

export default router;
