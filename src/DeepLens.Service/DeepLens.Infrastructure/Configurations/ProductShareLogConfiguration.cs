using DeepLens.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class ProductShareLogConfiguration : IEntityTypeConfiguration<ProductShareLog>
{
    public void Configure(EntityTypeBuilder<ProductShareLog> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Platform)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.DescriptionUsed)
            .IsRequired(false);

        // Foreign Key is automatically configured by EF if navigation property exists, but we can be explicit
        builder.HasOne(x => x.Product)
            .WithMany() // Assuming no reverse navigation
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
