using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DeepLens.Domain.Entities
{
    [Table("app_settings")]
    public class AppSetting
    {
        [Key]
        [Column("key")]
        [MaxLength(150)]
        public string Key { get; set; } = string.Empty;

        [Column("value")]
        public string? Value { get; set; }

        [Column("section")]
        [MaxLength(60)]
        public string Section { get; set; } = string.Empty;

        [Column("label")]
        [MaxLength(100)]
        public string Label { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("is_secret")]
        public bool IsSecret { get; set; } = false;

        [Column("data_type")]
        [MaxLength(20)]
        public string DataType { get; set; } = "string";

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
