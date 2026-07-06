using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepLens.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Create_ProductShareLogs_Table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "category",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "text", nullable: false),
                    metadata_json = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_category", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "seller",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    contact_info = table.Column<string>(type: "text", nullable: true),
                    rating = table.Column<decimal>(type: "numeric", nullable: false),
                    is_trusted = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_seller", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "product",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: true),
                    base_sku = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "text", nullable: true),
                    fabric = table.Column<string>(type: "text", nullable: true),
                    stitch_type = table.Column<string>(type: "text", nullable: true),
                    work_heaviness = table.Column<string>(type: "text", nullable: true),
                    tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    unified_attributes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_category_category_id",
                        column: x => x.category_id,
                        principalTable: "category",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "product_share_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    shared_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    description_used = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_share_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_share_logs_product_product_id",
                        column: x => x.product_id,
                        principalTable: "product",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_variant",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    variant_sku = table.Column<string>(type: "text", nullable: true),
                    color = table.Column<string>(type: "text", nullable: true),
                    fabric = table.Column<string>(type: "text", nullable: true),
                    stitch_type = table.Column<string>(type: "text", nullable: true),
                    work_heaviness = table.Column<string>(type: "text", nullable: true),
                    search_keywords = table.Column<List<string>>(type: "text[]", nullable: false),
                    attributes_json = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_variant", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_variant_product_product_id",
                        column: x => x.product_id,
                        principalTable: "product",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "image",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    variant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    product_id = table.Column<Guid>(type: "uuid", nullable: true),
                    color = table.Column<string>(type: "text", nullable: true),
                    storage_path = table.Column<string>(type: "text", nullable: false),
                    original_filename = table.Column<string>(type: "text", nullable: true),
                    file_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    mime_type = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    vector_id = table.Column<Guid>(type: "uuid", nullable: true),
                    p_hash = table.Column<string>(type: "text", nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    quality_score = table.Column<decimal>(type: "numeric", nullable: true),
                    features_extracted = table.Column<bool>(type: "boolean", nullable: false),
                    indexed = table.Column<bool>(type: "boolean", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    metadata_json = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_image", x => x.id);
                    table.ForeignKey(
                        name: "fk_image_product_variant_variant_id",
                        column: x => x.variant_id,
                        principalTable: "product_variant",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "seller_listing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    variant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    seller_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "text", nullable: true),
                    current_price = table.Column<decimal>(type: "numeric", nullable: true),
                    currency = table.Column<string>(type: "text", nullable: false),
                    shipping_info = table.Column<string>(type: "text", nullable: false),
                    is_favorite = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true),
                    last_priced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    raw_data_json = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_seller_listing", x => x.id);
                    table.ForeignKey(
                        name: "fk_seller_listing_product_product_id",
                        column: x => x.product_id,
                        principalTable: "product",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_seller_listing_product_variant_variant_id",
                        column: x => x.variant_id,
                        principalTable: "product_variant",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_seller_listing_seller_seller_id",
                        column: x => x.seller_id,
                        principalTable: "seller",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "price_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    listing_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price = table.Column<decimal>(type: "numeric", nullable: false),
                    currency = table.Column<string>(type: "text", nullable: false),
                    effective_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    seller_listing_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_price_history", x => x.id);
                    table.ForeignKey(
                        name: "fk_price_history_seller_listing_seller_listing_id",
                        column: x => x.seller_listing_id,
                        principalTable: "seller_listing",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_image_variant_id",
                table: "image",
                column: "variant_id");

            migrationBuilder.CreateIndex(
                name: "ix_price_history_seller_listing_id",
                table: "price_history",
                column: "seller_listing_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_category_id",
                table: "product",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_share_logs_product_id",
                table: "product_share_logs",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_variant_product_id",
                table: "product_variant",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_seller_listing_product_id",
                table: "seller_listing",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_seller_listing_seller_id",
                table: "seller_listing",
                column: "seller_id");

            migrationBuilder.CreateIndex(
                name: "ix_seller_listing_variant_id",
                table: "seller_listing",
                column: "variant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "image");

            migrationBuilder.DropTable(
                name: "price_history");

            migrationBuilder.DropTable(
                name: "product_share_logs");

            migrationBuilder.DropTable(
                name: "seller_listing");

            migrationBuilder.DropTable(
                name: "product_variant");

            migrationBuilder.DropTable(
                name: "seller");

            migrationBuilder.DropTable(
                name: "product");

            migrationBuilder.DropTable(
                name: "category");
        }
    }
}
