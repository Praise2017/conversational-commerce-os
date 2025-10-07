import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import contactsRouter from './routes/contacts.js';
import { requireWorkspace } from './middleware/tenant.js';
import { authOptional, authRequired } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import messagesRouter from './routes/messages.js';
import inboundRouter from './routes/inbound.js';
import client from 'prom-client';
import channelsRouter from './routes/channels.js';
import broadcastsRouter from './routes/broadcasts.js';
import templatesRouter from './routes/templates.js';
import analyticsRouter from './routes/analytics.js';
import complianceRouter from './routes/compliance.js';
import { listWorkspaceIds, listBroadcasts, runBroadcastNow } from './storage/db.js';
import { getPool } from './db/pg.js';
import * as bRepo from './repositories/broadcastsRepo.js';
import * as contactRepo from './repositories/contactsRepo.js';
import * as msgRepo from './repositories/messagesRepo.js';
import statusWhatsappRouter from './routes/whatsappStatus.js';
import { corsOptionsFromEnv, securityHeadersMiddleware, rateLimitMiddleware } from './security.js';
import * as jobsRepo from './repositories/jobsRepo.js';
import * as jobHandlers from './jobs/handlers.js';
import segmentsRouter from './routes/segments.js';
import { logger } from './logger.js';
const APP_NAME = process.env.APP_NAME || 'PraisePoint E Commerce';
const app = express();

// Cast to satisfy TS types under NodeNext
app.use((pinoHttp as unknown as (opts: any) => import('express').RequestHandler)({ logger }));
app.use(cors(corsOptionsFromEnv()));
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '2mb' }));
app.use(rateLimitMiddleware);
app.use(authOptional);

app.get('/healthz', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/', (_req, res) => res
  .type('html')
  .send(`<!doctype html><html><body><h1>${APP_NAME} API</h1><p>OK</p></body></html>`)
);

// metrics
client.collectDefaultMetrics();
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// routes
app.use('/v1/auth', authRouter); // before workspace requirement
const ENFORCE_AUTH = (process.env.ENFORCE_AUTH || 'false').toLowerCase() === 'true';
if (ENFORCE_AUTH) {
  app.use('/v1', authRequired, requireWorkspace);
} else {
  app.use('/v1', requireWorkspace);
}
app.use('/v1/contacts', contactsRouter);
app.use('/v1/messages', messagesRouter);
app.use('/v1/webhooks/inbound', inboundRouter);
app.use('/v1/webhooks/status/whatsapp', statusWhatsappRouter);
app.use('/v1/channels', channelsRouter);
app.use('/v1/broadcasts', broadcastsRouter);
app.use('/v1/templates', templatesRouter);
app.use('/v1/analytics', analyticsRouter);
app.use('/v1/compliance', complianceRouter);
app.use('/v1/segments', segmentsRouter);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(port, async () => {
  logger.info({ port }, 'backend listening');
  try {
    if ((process.env.OTEL_ENABLED || 'false').toLowerCase() === 'true') {
      const m = await import('./otel.js');
      if (typeof (m as any).initOtel === 'function') {
        await (m as any).initOtel();
        logger.info('OTEL initialized');
      }
    }
  } catch {
    // ignore otel init issues
  }
});

// Simple scheduler + job worker: process scheduled broadcasts and background jobs
setInterval(async () => {
  try {
    const now = new Date();
    const pool = getPool();
    if (!pool) {
      // In-memory scheduler
      for (const ws of listWorkspaceIds()) {
        const scheduled = listBroadcasts(ws).filter(b => b.status === 'scheduled' && b.scheduledAt && new Date(b.scheduledAt) <= now);
        for (const b of scheduled) {
          logger.debug({ workspaceId: ws, broadcastId: b.id }, 'running scheduled broadcast (in-memory)');
          runBroadcastNow(ws, b);
        }
      }
    } else {
      // DB-backed scheduler
      const due = await bRepo.listDue(now.toISOString());
      for (const item of due) {
        try {
          // enqueue durable job instead of running inline
          await jobsRepo.enqueue(item.workspaceId, 'broadcast.run', { workspaceId: item.workspaceId, broadcastId: item.id, templateText: item.templateText, segmentId: (item as any).segmentId ?? null });
          logger.info({ workspaceId: item.workspaceId, broadcastId: item.id }, 'enqueued broadcast job');
          await bRepo.markRunning(item.workspaceId, item.id);
        } catch {
          // ignore enqueue errors to avoid breaking loop
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'broadcast scheduler failed');
  }
}, 5000);

// Background job worker (single worker in-process)
setInterval(async () => {
  try {
    const pool = getPool();
    if (!pool) return; // only run in DB mode
    const job = await jobsRepo.claimNext();
    if (!job) return;
    switch (job.jtype) {
      case 'broadcast.run':
        await jobHandlers.handleBroadcastRun(job.payload);
        await jobsRepo.markSuccess(job.id);
        logger.info({ jobId: job.id, workspaceId: job.workspaceId }, 'job succeeded');
        break;
      default:
        await jobsRepo.markFailed(job.id, false);
    }
  } catch (err) {
    logger.error({ err }, 'job worker failure');
  }
}, 2000);
