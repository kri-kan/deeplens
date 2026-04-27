using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CompetitorIntel.Orchestrator.Migrations
{
    /// <inheritdoc />
    public partial class AddAppSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_settings",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    value = table.Column<string>(type: "text", nullable: true),
                    section = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_secret = table.Column<bool>(type: "boolean", nullable: false),
                    data_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_settings", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "competitor_watchlist",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    platform_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    display_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    profile_pic_url = table.Column<string>(type: "text", nullable: true),
                    bio = table.Column<string>(type: "text", nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_scraped_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    follower_count = table.Column<long>(type: "bigint", nullable: true),
                    following_count = table.Column<long>(type: "bigint", nullable: true),
                    post_count = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_competitor_watchlist", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "competitor_videos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    watchlist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    platform_video_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    url = table.Column<string>(type: "text", nullable: true),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    media_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    like_count = table.Column<long>(type: "bigint", nullable: false),
                    comment_count = table.Column<long>(type: "bigint", nullable: false),
                    view_count = table.Column<long>(type: "bigint", nullable: false),
                    posted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_competitor_videos", x => x.id);
                    table.ForeignKey(
                        name: "fk_competitor_videos_competitor_watchlist_watchlist_id",
                        column: x => x.watchlist_id,
                        principalTable: "competitor_watchlist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "follower_snapshots",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    watchlist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    follower_count = table.Column<long>(type: "bigint", nullable: false),
                    following_count = table.Column<long>(type: "bigint", nullable: true),
                    snapshot_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_follower_snapshots", x => x.id);
                    table.ForeignKey(
                        name: "fk_follower_snapshots_competitor_watchlist_watchlist_id",
                        column: x => x.watchlist_id,
                        principalTable: "competitor_watchlist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scraper_jobs_active",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    watchlist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    job_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    queue_order = table.Column<int>(type: "integer", nullable: false),
                    origin = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    next_run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    target_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    target_count = table.Column<int>(type: "integer", nullable: true),
                    scraped_count = table.Column<int>(type: "integer", nullable: false),
                    last_cursor = table.Column<string>(type: "text", nullable: true),
                    assigned_burner_username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    error_message = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_scraper_jobs_active", x => x.id);
                    table.ForeignKey(
                        name: "fk_scraper_jobs_active_competitor_watchlist_watchlist_id",
                        column: x => x.watchlist_id,
                        principalTable: "competitor_watchlist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scraper_jobs_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    watchlist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    job_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    origin = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    scraped_count = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_scraper_jobs_history", x => x.id);
                    table.ForeignKey(
                        name: "fk_scraper_jobs_history_competitor_watchlist_watchlist_id",
                        column: x => x.watchlist_id,
                        principalTable: "competitor_watchlist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_competitor_videos_platform_platform_video_id",
                table: "competitor_videos",
                columns: new[] { "platform", "platform_video_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_competitor_videos_watchlist_id",
                table: "competitor_videos",
                column: "watchlist_id");

            migrationBuilder.CreateIndex(
                name: "ix_follower_snapshots_watchlist_id",
                table: "follower_snapshots",
                column: "watchlist_id");

            migrationBuilder.CreateIndex(
                name: "ix_scraper_jobs_active_watchlist_id",
                table: "scraper_jobs_active",
                column: "watchlist_id");

            migrationBuilder.CreateIndex(
                name: "ix_scraper_jobs_history_watchlist_id",
                table: "scraper_jobs_history",
                column: "watchlist_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_settings");

            migrationBuilder.DropTable(
                name: "competitor_videos");

            migrationBuilder.DropTable(
                name: "follower_snapshots");

            migrationBuilder.DropTable(
                name: "scraper_jobs_active");

            migrationBuilder.DropTable(
                name: "scraper_jobs_history");

            migrationBuilder.DropTable(
                name: "competitor_watchlist");
        }
    }
}
