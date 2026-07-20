using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace DeepLens.Domain.Entities.Catalog;

[Table("llm_corrections")]
public class LlmCorrection
{
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("product_id")]
    public Guid ProductId { get; set; }

    [Column("source_text")]
    public string? SourceText { get; set; }

    [Column("previous_state")]
    public string PreviousState { get; set; } = "{}";

    [Column("new_state")]
    public string NewState { get; set; } = "{}";

    [Column("use_for_training")]
    public bool UseForTraining { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product? Product { get; set; }
}
