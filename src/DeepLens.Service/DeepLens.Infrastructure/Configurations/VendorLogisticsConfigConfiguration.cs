using DeepLens.Domain.Entities.Logistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class VendorLogisticsConfigConfiguration : IEntityTypeConfiguration<VendorLogisticsConfig>
{
    public void Configure(EntityTypeBuilder<VendorLogisticsConfig> builder)
    {
        builder.ToTable("vendor_logistics_configs");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FulfillmentMode).IsRequired().HasDefaultValue("direct_dispatch");
        builder.Property(x => x.AutoManifest).HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");

        builder.HasIndex(x => x.VendorId);
        builder.HasIndex(x => x.ReturnWarehouseId);
    }
}
