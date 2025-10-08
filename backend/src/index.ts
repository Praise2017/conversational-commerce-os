import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
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
import statusWhatsappRouter from './routes/whatsappStatus.js';
import { corsOptionsFromEnv, securityHeadersMiddleware, rateLimitMiddleware } from './security.js';
import * as jobsRepo from './repositories/jobsRepo.js';
import * as jobHandlers from './jobs/handlers.js';
import type { BroadcastRunPayload } from './jobs/handlers.js';
import segmentsRouter from './routes/segments.js';
import { logger, requestLogger, createTaskLogger } from './logger.js';
const APP_NAME = process.env.APP_NAME || 'PraisePoint E Commerce';
const APP_VERSION = process.env.APP_VERSION || 'dev';
const app = express();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const schedulerRunsTotal = new client.Counter({
  name: 'broadcast_scheduler_runs_total',
  help: 'Total broadcast scheduler iterations',
  labelNames: ['mode'],
});

const schedulerEnqueuedTotal = new client.Counter({
  name: 'broadcast_scheduler_enqueued_total',
  help: 'Broadcast jobs triggered by the scheduler',
});

const schedulerErrorsTotal = new client.Counter({
  name: 'broadcast_scheduler_errors_total',
  help: 'Total broadcast scheduler errors',
});

const jobProcessedTotal = new client.Counter({
  name: 'job_worker_processed_total',
  help: 'Jobs processed by in-process worker',
  labelNames: ['status', 'type'],
});

const schedulerLogger = createTaskLogger('broadcast-scheduler');
const jobLogger = createTaskLogger('job-worker');

type DueBroadcast = Awaited<ReturnType<typeof bRepo.listDue>>[number];

function toBroadcastPayload(item: DueBroadcast): BroadcastRunPayload {
  return {
    workspaceId: item.workspaceId,
    broadcastId: item.id,
    templateText: item.templateText,
    segmentId: item.segmentId ?? null,
  };
}

function isBroadcastRunPayload(value: unknown): value is BroadcastRunPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const { workspaceId, broadcastId, templateText, segmentId } = record;
  return typeof workspaceId === 'string'
    && typeof broadcastId === 'string'
    && typeof templateText === 'string'
    && (segmentId === null || typeof segmentId === 'string');
}

type OtelModule = { initOtel?: () => Promise<void> | void };

function hasInitOtel(module: unknown): module is OtelModule {
  return !!module && typeof (module as Record<string, unknown>).initOtel === 'function';
}

app.use(requestLogger());
app.use((req, res, next) => {
  const stopTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = (() => {
      if (typeof req.baseUrl === 'string' && req.baseUrl.length > 0) {
        return req.baseUrl;
      }
      if (typeof req.originalUrl === 'string') {
        return req.originalUrl.split('?')[0];
      }
      return typeof req.url === 'string' ? req.url : 'unknown';
    })();
    const labels: { method: string; route: string; status_code: string } = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };
    stopTimer(labels);
  });
  next();
});
app.use(cors(corsOptionsFromEnv()));
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '2mb' }));
app.use(rateLimitMiddleware);
app.use(authOptional);

app.get('/healthz', async (_req, res) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  const pool = getPool();
  if (pool) {
    try {
      await pool.query('SELECT 1');
    } catch (err: unknown) {
      dbStatus = 'error';
      const error = err instanceof Error ? err : new Error(String(err));
      const meta: { error: Error } = { error };
      logger.error(meta, 'healthz db check failed');
    }
  }
  const response = {
    status: dbStatus === 'ok' ? 'ok' : 'error',
    db: dbStatus,
    uptime: process.uptime(),
    version: APP_VERSION,
  };
  res.status(dbStatus === 'ok' ? 200 : 503).json(response);
});
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
      const mod = await import('./otel.js');
      if (hasInitOtel(mod)) {
        await mod.initOtel?.();
        logger.info({ otel: 'initialized' }, 'OTEL initialized');
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
    const mode = pool ? 'database' : 'memory';
    schedulerRunsTotal.inc({ mode });
    if (!pool) {
      // In-memory scheduler
      for (const ws of listWorkspaceIds()) {
        const scheduled = listBroadcasts(ws).filter(b => b.status === 'scheduled' && b.scheduledAt && new Date(b.scheduledAt) <= now);
        for (const b of scheduled) {
          const logMeta: Record<string, string> = { workspaceId: ws, broadcastId: b.id };
          schedulerLogger.debug(logMeta, 'running scheduled broadcast (in-memory)');
          try {
            runBroadcastNow(ws, b);
            schedulerEnqueuedTotal.inc();
          } catch (err: unknown) {
            schedulerErrorsTotal.inc();
            const error = err instanceof Error ? err : new Error(String(err));
            const meta = { ...logMeta, error };
            schedulerLogger.error(meta, 'in-memory broadcast run failed');
          }
        }
      }
    } else {
      // DB-backed scheduler
      const dueRaw = await bRepo.listDue(now.toISOString());
      for (const item of dueRaw) {
        const payload = toBroadcastPayload(item);
        const logMeta: Record<string, string> = {
          workspaceId: payload.workspaceId,
          broadcastId: payload.broadcastId,
        };
        try {
          // enqueue durable job instead of running inline
          await jobsRepo.enqueue(payload.workspaceId, 'broadcast.run', payload);
          schedulerEnqueuedTotal.inc();
          schedulerLogger.info(logMeta, 'enqueued broadcast job');
          await bRepo.markRunning(payload.workspaceId, payload.broadcastId);
        } catch (err: unknown) {
          schedulerErrorsTotal.inc();
          const error = err instanceof Error ? err : new Error(String(err));
          const meta = { ...logMeta, error };
          schedulerLogger.error(meta, 'failed to enqueue broadcast job');
        }
      }
    }
  } catch (err: unknown) {
    schedulerErrorsTotal.inc();
    const error = err instanceof Error ? err : new Error(String(err));
    const meta: { error: Error } = { error };
    schedulerLogger.error(meta, 'broadcast scheduler failed');
  }
}, 5000);

// Background job worker (single worker in-process)
setInterval(async () => {
  let jobType: string = 'unknown';
  let jobId: string | undefined;
  try {
    const pool = getPool();
    if (!pool) return; // only run in DB mode
    const job = await jobsRepo.claimNext();
    if (!job) return;
    jobType = job.jtype;
    jobId = job.id;
    const jobMeta: Record<string, string> = {
      jobId: job.id,
      workspaceId: job.workspaceId,
      type: job.jtype,
    };
    const payloadRecord: unknown = job.payload;
    if (!isBroadcastRunPayload(payloadRecord)) {
      jobProcessedTotal.inc({ status: 'failed', type: job.jtype });
      await jobsRepo.markFailed(job.id, false);
      jobLogger.error(jobMeta, 'job payload invalid, marking failed');
      return;
    }
    const payload = payloadRecord;
    switch (job.jtype) {
      case 'broadcast.run':
        await jobHandlers.handleBroadcastRun(payload);
        await jobsRepo.markSuccess(job.id);
        jobProcessedTotal.inc({ status: 'success', type: job.jtype });
        jobLogger.info(jobMeta, 'job succeeded');
        break;
      default:
        await jobsRepo.markFailed(job.id, false);
        jobProcessedTotal.inc({ status: 'failed', type: job.jtype });
        jobLogger.warn(jobMeta, 'job type not handled');
    }
  } catch (err: unknown) {
    jobProcessedTotal.inc({ status: 'failed', type: jobType });
    const error = err instanceof Error ? err : new Error(String(err));
    const meta = { error, jobId, jobType };
    jobLogger.error(meta, 'job worker failure');
  }
}, 2000);
