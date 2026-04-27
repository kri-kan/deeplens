using CompetitorIntel.Orchestrator.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Data
{
    public class CompetitorContext : DbContext
    {
        public CompetitorContext(DbContextOptions<CompetitorContext> options) : base(options)
        {
        }

        public DbSet<CompetitorWatchlist> Competitors { get; set; }
        public DbSet<FollowerSnapshot> FollowerSnapshots { get; set; }
        public DbSet<ScraperJobActive> ActiveJobs { get; set; }
        public DbSet<ScraperJobHistory> JobHistory { get; set; }
        public DbSet<CompetitorPost> Posts { get; set; }
        public DbSet<AppSetting> AppSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Snake case is handled by UseSnakeCaseNamingConvention in Program.cs
            
            modelBuilder.Entity<ScraperJobActive>()
                .HasOne(j => j.Watchlist)
                .WithMany()
                .HasForeignKey(j => j.WatchlistId);

            modelBuilder.Entity<ScraperJobHistory>()
                .HasOne(j => j.Watchlist)
                .WithMany()
                .HasForeignKey(j => j.WatchlistId);

            modelBuilder.Entity<CompetitorPost>()
                .HasOne(p => p.Watchlist)
                .WithMany()
                .HasForeignKey(p => p.WatchlistId);

            modelBuilder.Entity<CompetitorPost>()
                .HasIndex(p => new { p.Platform, p.PlatformPostId })
                .IsUnique();

            // AppSetting has a string PK — tell EF not to auto-generate it
            modelBuilder.Entity<AppSetting>()
                .HasKey(s => s.Key);
            modelBuilder.Entity<AppSetting>()
                .Property(s => s.Key)
                .ValueGeneratedNever();
        }
    }
}
