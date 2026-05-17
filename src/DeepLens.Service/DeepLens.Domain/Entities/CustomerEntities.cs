using System;
using System.Collections.Generic;

namespace DeepLens.Domain.Entities;

public class Customer
{
    public Guid Id { get; set; }
    public int CustomerId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? InstagramId { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public string ReferralCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<CustomerAddress> Addresses { get; set; } = new();
    public List<CustomerInstagramAccount> InstagramAccounts { get; set; } = new();
    public List<string> PreferredLanguages { get; set; } = new();

    public string FullName => string.Join(" ", new[] { FirstName, LastName }.Where(s => !string.IsNullOrEmpty(s)));
}

public class CustomerInstagramAccount
{
    public Guid Id { get; set; }
    public Guid? CustomerId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public bool IsPrimary { get; set; }
}

public class CustomerAddress
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public string Pincode { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
