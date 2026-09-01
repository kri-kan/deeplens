using DeepLens.Domain.Entities.Logistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class NdrTaskConfiguration : IEntityTypeConfiguration<NdrTask>
{
    public void Configure(EntityTypeBuilder<NdrTask> builder)
    {
        builder.ToTable("ndr_tasks");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ActionStatus).IsRequired().HasDefaultValue("open");
        builder.Property(x => x.DispatchedToDelhivery).HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("NOW()");

        builder.HasIndex(x => x.ShipmentId);
        builder.HasIndex(x => x.AwbNumber);
        builder.HasIndex(x => x.ActionStatus);
    }
}
