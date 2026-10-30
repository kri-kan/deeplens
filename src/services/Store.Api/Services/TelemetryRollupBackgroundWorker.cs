using Store.Api.Services;

namespace Store.Api.Services;

public class TelemetryRollupBackgroundWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TelemetryRollupBackgroundWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(6);
    private const int RetentionDays = 30;

    public TelemetryRollupBackgroundWorker(IServiceProvider serviceProvider, ILogger<TelemetryRollupBackgroundWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TelemetryRollupBackgroundWorker initialized. Retention period: {Days} days. Schedule: every 6 hours.", RetentionDays);

        // Initial delay to avoid slowing down startup
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var telemetryService = scope.ServiceProvider.GetRequiredService<ITelemetryService>();

                _logger.LogInformation("Executing automated telemetry rollup & 30-day retention purge...");
                var result = await telemetryService.RollupTelemetrySignalsAsync(RetentionDays, stoppingToken);

                _logger.LogInformation("Telemetry rollup completed successfully: {Sessions} sessions aggregated, {Profiles} taste profiles updated, {Purged} expired signals purged.",
                    result.SessionsProcessed, result.ProfilesUpdated, result.SignalsPurged);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during background telemetry rollup and purge execution.");
            }

            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("TelemetryRollupBackgroundWorker stopped.");
    }
}
