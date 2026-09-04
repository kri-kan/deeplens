using System;

namespace DeepLens.Domain.Entities.Logistics;

public class NdrTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ShipmentId { get; set; }
    public string? AwbNumber { get; set; }
    public string? NdrReason { get; set; }
    public string? NdrCode { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerFeedback { get; set; }
    public string ActionStatus { get; set; } = "open"; // open, contacted, resolved, escalated, closed
    public string? ChosenAction { get; set; } // reattempt, return_to_origin, change_address, change_phone
    public DateTime? ReattemptDate { get; set; }
    public string? Remarks { get; set; }
    public bool DispatchedToDelhivery { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
