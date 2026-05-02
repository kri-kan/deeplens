using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Infrastructure.IdGeneration;
using DeepLens.Infrastructure.Persistence;
using DeepLens.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace DeepLens.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();
        services.AddScoped<ISequencedIdGenerator, SequencedIdGenerator>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<DeepLens.Contracts.Customers.ICustomerService, DeepLens.Infrastructure.Services.CustomerService>();
        services.AddScoped<DeepLens.Contracts.Marketing.IWhatsAppService, DeepLens.Infrastructure.Services.WhatsAppService>();
        services.AddScoped<DeepLens.Application.Abstractions.Services.IAppSettingsService, DeepLens.Infrastructure.Services.AppSettingsService>();

        return services;
    }
}
