using DeepLens.Domain.Entities.Logistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class ShipmentItemConfiguration : IEntityTypeConfiguration<ShipmentItem>
{
    public void Configure(EntityTypeBuilder<ShipmentItem> builder)
    {
        builder.ToTable("shipment_items");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Quantity).HasDefaultValue(1);
        builder.Property(x => x.UnitPrice).HasPrecision(12, 2).HasDefaultValue(0m);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");

        builder.HasIndex(x => x.ShipmentId);
        builder.HasIndex(x => x.ProductId);
    }
}
