import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

let isInitialized = false;

export const initOtel = () => {
  if (isInitialized) return;

  const exporter = new OTLPTraceExporter({
    url: process.env.EXPO_PUBLIC_OTEL_ENDPOINT!,
    headers: {},
  });

  const provider = new WebTracerProvider({
    sampler: new TraceIdRatioBasedSampler(Number(process.env.EXPO_PUBLIC_OTEL_SAMPLING_RATIO || 0.1)),
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
  const tracer = trace.getTracer('manual-instrumentation');

  return tracer.startActiveSpan(spanName, async (span: Span) => {
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
