import pino, { type Logger } from 'pino';
import pinoHttp from 'pino-http';
import type { Options as PinoHttpOptions, HttpLogger } from 'pino-http';
import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: process.env.APP_NAME || 'PraisePoint E Commerce API',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

type AppRequest = Request & { id?: string; user?: unknown };

const pinoHttpFactory = pinoHttp as unknown as (options?: PinoHttpOptions) => HttpLogger;

export function requestLogger(): HttpLogger {
  return pinoHttpFactory({
    logger,
    serializers: {
      err: pino.stdSerializers.err,
      req(rawReq: IncomingMessage) {
        const req = rawReq as AppRequest;
        const userObject = req.user && typeof req.user === 'object' ? (req.user as Record<string, unknown>) : undefined;
        const userId = userObject && typeof userObject.sub === 'string'
          ? userObject.sub
          : userObject && typeof userObject.id === 'string'
            ? userObject.id
            : undefined;
        return {
          method: req.method,
          url: req.url,
          workspaceId: req.workspaceId,
          userId,
        };
      },
    },
    customProps: (rawReq: IncomingMessage) => {
      const req = rawReq as AppRequest;
      const userObject = req.user && typeof req.user === 'object' ? (req.user as Record<string, unknown>) : undefined;
      const userId = userObject && typeof userObject.sub === 'string'
        ? userObject.sub
        : userObject && typeof userObject.id === 'string'
          ? userObject.id
          : undefined;
      const requestId = typeof req.id === 'string' ? req.id : undefined;
      const workspaceId = typeof req.workspaceId === 'string' ? req.workspaceId : undefined;
      return {
        requestId,
        workspaceId,
        userId,
      };
    },
  });
}

export function createTaskLogger(task: string): Logger {
  return logger.child({ task });
}
