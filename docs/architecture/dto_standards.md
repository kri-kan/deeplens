# DeepLens DTO Standardization Guidelines

To ensure a stable and predictable data flow between the .NET backend and the React Native frontend, all Data Transfer Objects (DTOs) must follow these strict conventions.

## The Core Rule
**All JSON properties MUST be `camelCase`.**

Regardless of the C# property name (which should follow `PascalCase`), the serialized JSON key must be explicitly defined using the `[JsonPropertyName]` attribute.

## Backend (C#) Implementation

### 1. Mandatory Attributes
Every public property in a DTO (especially those in `DeepLens.Contracts`) must have an explicit `[JsonPropertyName]` attribute.

```csharp
public class UserProfileDto
{
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [JsonPropertyName("displayName")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }
}
```

### 2. Avoid Dynamic Types
Never return `dynamic`, `object`, or `IEnumerable<dynamic>` from a controller. These types bypass compile-time checks and lead to inconsistent serialization (often defaulting to PascalCase), which breaks the frontend.

**Bad:**
```csharp
[HttpGet]
public async Task<IActionResult> GetJobs() 
{
    return Ok(await _db.QueryAsync("SELECT * FROM jobs")); // Returns dynamic objects
}
```

**Good:**
```csharp
[HttpGet]
public async Task<ActionResult<IEnumerable<JobDto>>> GetJobs() 
{
    var jobs = await _db.QueryAsync<JobDto>("SELECT * FROM jobs");
    return Ok(jobs);
}
```

## Frontend (TypeScript) Implementation

### 1. Matching Interfaces
TypeScript interfaces must exactly match the `JsonPropertyName` defined in the backend.

```typescript
export interface UserProfile {
  userId: string;
  displayName: string;
  isActive: boolean;
}
```

### 2. No Fallback Access
Avoid code that checks for multiple casing variants (e.g., `item.is_active || item.isActive`). If the data schema is correct, only the `camelCase` version should exist.

## Automated Enforcement
We use **NetArchTest** in the `DeepLens.ArchitectureTests` project to enforce these rules.

- **Rule**: All public properties in `DeepLens.Contracts` must have `[JsonPropertyName]`.
- **Run command**: `dotnet test tests/DeepLens.ArchitectureTests`
