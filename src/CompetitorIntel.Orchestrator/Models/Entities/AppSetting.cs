using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CompetitorIntel.Orchestrator.Models.Entities
{
    [Table("app_settings")]
    public class AppSetting
    {
        /// <summary>Hierarchical key e.g. "Meta:AccessToken"</summary>
        [Key]
        [Column("key")]
        [MaxLength(150)]
        public string Key { get; set; } = string.Empty;

        [Column("value")]
        public string? Value { get; set; }

        /// <summary>Grouping label used for UI sectioning e.g. "Meta", "Infrastructure"</summary>
        [Column("section")]
        [MaxLength(60)]
        public string Section { get; set; } = string.Empty;

        /// <summary>Human-readable display name shown in the settings UI.</summary>
        [Column("label")]
        [MaxLength(100)]
        public string Label { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        /// <summary>When true the UI masks the value and the GET API returns "••••••••".</summary>
        [Column("is_secret")]
        public bool IsSecret { get; set; } = false;

        /// <summary>string | integer | boolean | datetime</summary>
        [Column("data_type")]
        [MaxLength(20)]
        public string DataType { get; set; } = "string";

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
