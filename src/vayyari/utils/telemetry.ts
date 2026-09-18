import { Platform } from 'react-native';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';
let isInitialized = false;

export const initOtel = async () => {
  if (Platform.OS === 'web' || isInitialized) return;

  try {
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

    // Permanently remove PerformanceObserver from global scope on native.
    // The OTel fetch plugin checks `typeof PerformanceObserver !== 'function'` on EVERY
    // fetch call (in _prepareSpanData) and calls observer.observe({ entryTypes: ['resource'] })
    // — the deprecated API — if it's present. Hermes fires "Deprecated API for given entry
    // type." on every network request as a result. Resource timing via PerformanceObserver
    // has zero value in native context; OTel spans already capture timing via hrTime().
    (global as any).PerformanceObserver = undefined;

    // React Native's Performance implementation only supports 'mark' and 'measure' timeline entries.
    // When OpenTelemetry's FetchInstrumentation finishes a fetch call and observer entries are empty,
    // it falls back to calling `performance.getEntriesByType('resource')`.
    // In Hermes/React Native, Performance.getEntriesByType('resource') prints:
    // "console.warn('Deprecated API for given entry type.')" on every single HTTP request.
    // We override getEntriesByType so querying 'resource' cleanly returns [] without warning.
    if (typeof performance !== 'undefined') {
      if (typeof performance.getEntriesByType === 'function') {
        const origGetEntriesByType = performance.getEntriesByType.bind(performance);
        performance.getEntriesByType = ((entryType: string) => {
          if (entryType === 'resource') return [];
          return origGetEntriesByType(entryType as any);
        }) as any;
      }
      if (typeof performance.getEntriesByName === 'function') {
        const origGetEntriesByName = performance.getEntriesByName.bind(performance);
        performance.getEntriesByName = ((name: string, entryType?: string) => {
          if (entryType === 'resource') return [];
          return origGetEntriesByName(name, entryType as any);
        }) as any;
      }
    }

    // Register instrumentations explicitly
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          // clearTimingResources: false — performance.clearResourceTimings() is a browser-only
          // Web Performance API not available in React Native (Hermes/JSC). Enabling it causes
          // "TypeError: undefined is not a function" on every fetch completion on Android.
          clearTimingResources: false,
        }),
      ],
      tracerProvider: provider,
    });

    isInitialized = true;
    console.log('OpenTelemetry successfully lazily loaded and initialized with 10% sampling.');
  } catch (err) {
    console.warn('[Telemetry] OpenTelemetry omitted or failed to initialize on current platform:', err);
  }
};

/**
 * Wraps a critical business flow in an OpenTelemetry Span.
 * Tracks execution time, success, and any exceptions thrown.
 */
export const wrapInSpan = async <T>(spanName: string, operation: () => Promise<T>): Promise<T> => {
  if (Platform.OS === 'web') {
    return operation();
  }
  try {
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
  } catch (_err) {
    // Graceful fallback: execute operation directly without telemetry if module import fails
    return operation();
  }
};
