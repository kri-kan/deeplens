namespace Store.Api.Services;

public class CartPruningBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CartPruningBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(12);

    public CartPruningBackgroundService(IServiceProvider serviceProvider, ILogger<CartPruningBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cart and Wishlist TTL Pruning Background Service started. Interval: {Interval}h", _checkInterval.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var cartService = scope.ServiceProvider.GetRequiredService<ICartService>();
                var (prunedCarts, prunedWishlists) = await cartService.PruneExpiredCartsAndWishlistsAsync();

                if (prunedCarts > 0 || prunedWishlists > 0)
                {
                    _logger.LogInformation("TTL Prune execution finished: {Carts} carts (>30d), {Wishlists} wishlists (>100d) cleaned.", prunedCarts, prunedWishlists);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing TTL Cart/Wishlist pruning background job.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }
}
