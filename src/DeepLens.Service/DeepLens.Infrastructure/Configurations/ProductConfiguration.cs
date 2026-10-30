using DeepLens.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DeepLens.Infrastructure.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.Property(x => x.IsStarred)
            .HasColumnName("is_starred")
            .HasDefaultValue(false);

        builder.Property(x => x.IsMediaReviewRequired)
            .HasColumnName("is_media_review_required")
            .HasDefaultValue(false);
    }
}
