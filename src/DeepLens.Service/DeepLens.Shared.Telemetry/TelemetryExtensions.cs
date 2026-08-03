using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace DeepLens.Shared.Telemetry;

public static class TelemetryExtensions
{
    public static IServiceCollection AddDeepLensTelemetry(
        this IServiceCollection services,
        IConfiguration configuration,
        string serviceName)
    {
        var isContainer = string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase);
        var defaultEndpoint = isContainer ? "http://otel-collector:4317" : "http://localhost:4317";

        var otlpEndpointStr = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")
            ?? configuration["OpenTelemetry:OtlpEndpoint"]
            ?? defaultEndpoint;

        var otlpUri = new Uri(otlpEndpointStr);

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing => tracing
                .AddSource(serviceName)
                .AddSource("DeepLens")
                .AddAspNetCoreInstrumentation(options =>
                {
                    options.RecordException = true;
                })
                .AddHttpClientInstrumentation(options =>
                {
                    options.RecordException = true;
                })
                .AddNpgsql()
                .AddOtlpExporter(options =>
                {
                    options.Endpoint = otlpUri;
                }))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddPrometheusExporter());

        return services;
    }
}
