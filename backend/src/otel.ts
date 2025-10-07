let sdk: any | null = null;

export async function initOtel() {
  if ((process.env.OTEL_ENABLED || 'false').toLowerCase() !== 'true') return;
  try {
    const api = await import('@opentelemetry/api');
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.ERROR);
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
    const serviceName = process.env.OTEL_SERVICE_NAME || 'praisepoint-api';
    sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      instrumentations: [getNodeAutoInstrumentations()],
      resource: undefined
    });
    await sdk.start();
    process.on('SIGTERM', () => sdk?.shutdown().catch(()=>{}));
    process.on('SIGINT', () => sdk?.shutdown().catch(()=>{}));
  } catch {
    // ignore otel init problems in dev
  }
}
