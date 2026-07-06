import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';
let isInitialized = false;

export const initOtel = async () => {
  if (isInitialized) return;

  const { diag, DiagConsoleLogger, DiagLogLevel } = await import('@opentelemetry/api');
  const { WebTracerProvider, BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-web');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { FetchInstrumentation } = await import('@opentelemetry/instrumentation-fetch');
  const { registerInstrumentations } = await import('@opentelemetry/instrumentation');
  const { TraceIdRatioBasedSampler } = await import('@opentelemetry/sdk-trace-base');

  // Set internal OTel logger (INFO level for production stability)
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const otelEndpoint = getOtelEndpointUrl() || "http://192.168.0.170:4318/v1/traces";
  
  const exporter = new OTLPTraceExporter({
    url: otelEndpoint,
  });

  const provider = new WebTracerProvider({
    sampler: new TraceIdRatioBasedSampler(0.1), // 10% sampling for performance
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  // Initialize the Provider with default context manager and propagator
  provider.register();

  // Register instrumentations explicitly
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        clearTimingResources: true,
      }),
    ],
    tracerProvider: provider,
  });

  isInitialized = true;
  console.log('OpenTelemetry successfully lazily loaded and initialized with 10% sampling.');
};

/**
 * Wraps a critical business flow in an OpenTelemetry Span.
 * Tracks execution time, success, and any exceptions thrown.
 */
export const wrapInSpan = async <T>(spanName: string, operation: () => Promise<T>): Promise<T> => {
  const { trace, SpanStatusCode } = await import('@opentelemetry/api');
  const tracer = trace.getTracer('manual-instrumentation');

  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
};
