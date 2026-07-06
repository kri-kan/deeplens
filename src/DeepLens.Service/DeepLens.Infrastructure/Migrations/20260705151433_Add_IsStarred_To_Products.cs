using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepLens.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_IsStarred_To_Products : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_starred",
                table: "product",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_starred",
                table: "product");
        }
    }
}
