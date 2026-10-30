using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepLens.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_IsMediaReviewRequired_To_Products : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_media_review_required",
                table: "product",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_media_review_required",
                table: "product");
        }
    }
}
