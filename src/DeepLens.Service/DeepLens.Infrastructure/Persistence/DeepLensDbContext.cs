using DeepLens.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace DeepLens.Infrastructure.Persistence;

public class DeepLensDbContext : DbContext
{
    public DeepLensDbContext(DbContextOptions<DeepLensDbContext> options)
        : base(options)
    {
    }

    public DbSet<ProductShareLog> ProductShareLogs { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.UseSnakeCaseNamingConvention();
    }
}
