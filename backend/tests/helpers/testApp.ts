import express from 'express';
import cors from 'cors';
import contactsRouter from '../../src/routes/contacts.js';
import messagesRouter from '../../src/routes/messages.js';
import inboundRouter from '../../src/routes/inbound.js';
import channelsRouter from '../../src/routes/channels.js';
import broadcastsRouter from '../../src/routes/broadcasts.js';
import templatesRouter from '../../src/routes/templates.js';
import analyticsRouter from '../../src/routes/analytics.js';
import complianceRouter from '../../src/routes/compliance.js';
import segmentsRouter from '../../src/routes/segments.js';
import statusWhatsappRouter from '../../src/routes/whatsappStatus.js';
import workflowsRouter from '../../src/routes/workflows.js';
import authRouter from '../../src/routes/auth.js';
import { authOptional, authRequired } from '../../src/middleware/auth.js';
import { requireWorkspace } from '../../src/middleware/tenant.js';
import { corsOptionsFromEnv, securityHeadersMiddleware, rateLimitMiddleware } from '../../src/security.js';
import { requestLogger } from '../../src/logger.js';

export function createTestApp() {
  delete process.env.DATABASE_URL;
  const app = express();

  app.use(requestLogger());
  app.use(cors(corsOptionsFromEnv()));
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(rateLimitMiddleware);
  app.use(authOptional);

  app.use('/v1/auth', authRouter);

  const enforceAuth = (process.env.ENFORCE_AUTH || 'false').toLowerCase() === 'true';
  if (enforceAuth) {
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
  app.use('/v1/workflows', workflowsRouter);

  return app;
}
