using DeepLens.Domain.Entities.Logistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("shipments");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Status).IsRequired().HasDefaultValue("pending");
        builder.Property(x => x.ShippingMode).HasDefaultValue("Surface");
        builder.Property(x => x.FulfillmentType).HasDefaultValue("direct_dispatch");
        builder.Property(x => x.CodAmount).HasPrecision(12, 2).HasDefaultValue(0m);
        builder.Property(x => x.ProcureStatus).HasDefaultValue("not_applicable");
        builder.Property(x => x.Metadata).HasColumnType("jsonb").HasDefaultValue("{}");
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");

        builder.HasIndex(x => x.OrderId);
        builder.HasIndex(x => x.OrderNumber);
        builder.HasIndex(x => x.ShipmentNumber).IsUnique();
        builder.HasIndex(x => x.AwbNumber);
        builder.HasIndex(x => x.Status);

        builder.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
