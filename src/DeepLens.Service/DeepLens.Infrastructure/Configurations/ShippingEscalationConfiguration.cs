using DeepLens.Domain.Entities.Logistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class ShippingEscalationConfiguration : IEntityTypeConfiguration<ShippingEscalation>
{
    public void Configure(EntityTypeBuilder<ShippingEscalation> builder)
    {
        builder.ToTable("shipping_escalations");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.IssueType).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasDefaultValue("open");
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");

        builder.HasIndex(x => x.ShipmentId);
        builder.HasIndex(x => x.AwbNumber);
        builder.HasIndex(x => x.Status);
    }
}
