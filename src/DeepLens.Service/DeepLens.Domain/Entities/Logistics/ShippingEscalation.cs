using System;

namespace DeepLens.Domain.Entities.Logistics;

public class ShippingEscalation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ShipmentId { get; set; }
    public string? AwbNumber { get; set; }
    public string IssueType { get; set; } = "delay"; // delay, lost_in_transit, damaged, fake_attempt, rto_dispute, other
    public string? Description { get; set; }
    public string Status { get; set; } = "open"; // open, in_progress, resolved, closed
    public string? ExternalTicketId { get; set; }
    public string? ResolutionNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
