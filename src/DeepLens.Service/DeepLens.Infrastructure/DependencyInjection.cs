using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Infrastructure.IdGeneration;
using DeepLens.Infrastructure.Persistence;
using DeepLens.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DeepLens.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<DeepLensDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();
        services.AddScoped<ISequencedIdGenerator, SequencedIdGenerator>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<DeepLens.Application.Abstractions.Repositories.IProductShareLogRepository, DeepLens.Infrastructure.Repositories.ProductShareLogRepository>();
        services.AddScoped<DeepLens.Application.Abstractions.Repositories.IProductRepository, DeepLens.Infrastructure.Repositories.ProductRepository>();
        services.AddScoped<DeepLens.Contracts.Customers.ICustomerService, DeepLens.Infrastructure.Services.CustomerService>();
        services.AddScoped<DeepLens.Contracts.Marketing.IWhatsAppService, DeepLens.Infrastructure.Services.WhatsAppService>();
        services.AddScoped<DeepLens.Contracts.Marketing.ICommunicationBroadcastService, DeepLens.Infrastructure.Services.CommunicationBroadcastService>();
        services.AddScoped<DeepLens.Application.Abstractions.Services.IAppSettingsService, DeepLens.Infrastructure.Services.AppSettingsService>();
        services.AddScoped<DeepLens.Infrastructure.Services.IPermissionCacheService, DeepLens.Infrastructure.Services.PermissionCacheService>();
        services.AddScoped<DeepLens.Contracts.Catalog.IProductService, DeepLens.Infrastructure.Services.ProductService>();
        services.AddScoped<Microsoft.AspNetCore.Authentication.IClaimsTransformation, DeepLens.Infrastructure.Services.VayyariClaimsTransformation>();
        services.AddHttpClient<DeepLens.Application.Abstractions.Services.ILiteLlmService, DeepLens.Infrastructure.Services.LiteLlmService>();
        services.AddScoped<DeepLens.Application.Abstractions.Services.IProfileClassifierService, DeepLens.Infrastructure.Services.ProfileClassifierService>();

        // Logistics & Delhivery SDK Registrations
        services.AddHttpClient<DeepLens.Infrastructure.Clients.Delhivery.IDelhiveryClient, DeepLens.Infrastructure.Clients.Delhivery.DelhiveryClient>();
        services.AddScoped<DeepLens.Infrastructure.Persistence.Repositories.Logistics.ILogisticsRepository, DeepLens.Infrastructure.Persistence.Repositories.Logistics.LogisticsRepository>();
        services.AddScoped<DeepLens.Infrastructure.Services.Logistics.IPincodeService, DeepLens.Infrastructure.Services.Logistics.PincodeService>();
        services.AddScoped<DeepLens.Infrastructure.Services.Logistics.IPickupService, DeepLens.Infrastructure.Services.Logistics.PickupService>();
        services.AddScoped<DeepLens.Infrastructure.Services.Logistics.ITrackingService, DeepLens.Infrastructure.Services.Logistics.TrackingService>();
        services.AddScoped<DeepLens.Infrastructure.Services.Logistics.INdrService, DeepLens.Infrastructure.Services.Logistics.NdrService>();
        services.AddScoped<DeepLens.Infrastructure.Services.Logistics.IShipmentService, DeepLens.Infrastructure.Services.Logistics.ShipmentService>();

        return services;
    }
}
