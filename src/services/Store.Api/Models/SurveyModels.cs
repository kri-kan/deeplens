using System.Text.Json;
using System.Text.Json.Serialization;

namespace Store.Api.Models;

/// <summary>
/// Root Survey metadata record.
/// </summary>
public class SurveyDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = "taste_profile";

    [JsonPropertyName("audienceType")]
    public string AudienceType { get; set; } = "guest"; // "guest" | "registered"

    [JsonPropertyName("defaultLanguage")]
    public string DefaultLanguage { get; set; } = "en";

    [JsonPropertyName("hasUncommittedDraft")]
    public bool HasUncommittedDraft { get; set; }

    [JsonPropertyName("latestVersionNumber")]
    public int LatestVersionNumber { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Immutable Published Survey Version containing full layout & question mappings.
/// </summary>
public class SurveyVersionDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("surveyId")]
    public Guid SurveyId { get; set; }

    [JsonPropertyName("versionNumber")]
    public int VersionNumber { get; set; }

    [JsonPropertyName("versionComment")]
    public string VersionComment { get; set; } = string.Empty;

    [JsonPropertyName("themeId")]
    public string ThemeId { get; set; } = "ivory-editorial";

    [JsonPropertyName("coverPage")]
    public SurveyCoverPageConfigDto? CoverPage { get; set; }

    [JsonPropertyName("hiddenFields")]
    public List<SurveyHiddenFieldConfigDto>? HiddenFields { get; set; }

    [JsonPropertyName("pointsPerQuestion")]
    public int PointsPerQuestion { get; set; } = 175;

    [JsonPropertyName("totalMudrasTarget")]
    public int TotalMudrasTarget { get; set; } = 700;

    [JsonPropertyName("isArchived")]
    public bool IsArchived { get; set; }

    [JsonPropertyName("publishedBy")]
    public string? PublishedBy { get; set; }

    [JsonPropertyName("publishedAt")]
    public DateTime PublishedAt { get; set; }

    [JsonPropertyName("questions")]
    public List<SurveyVersionQuestionMappingDto> Questions { get; set; } = new();
}

/// <summary>
/// Introductory cover page briefing configuration.
/// </summary>
public class SurveyCoverPageConfigDto
{
    [JsonPropertyName("kicker")]
    public string Kicker { get; set; } = "CURATED TASTE DISCOVERY";

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("estimatedDuration")]
    public string EstimatedDuration { get; set; } = "~90 Secs";

    [JsonPropertyName("privacyText")]
    public string PrivacyText { get; set; } = "100% Private. No spam ever.";

    [JsonPropertyName("startCtaLabel")]
    public string StartCtaLabel { get; set; } = "Start Discovery";

    [JsonPropertyName("showLanguageSelector")]
    public bool ShowLanguageSelector { get; set; } = true;
}

/// <summary>
/// Contextual parameter prefill configuration (e.g. orderId, productId).
/// </summary>
public class SurveyHiddenFieldConfigDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("urlParam")]
    public string UrlParam { get; set; } = string.Empty;

    [JsonPropertyName("defaultValue")]
    public string? DefaultValue { get; set; }

    [JsonPropertyName("required")]
    public bool Required { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>
/// Atomic question revision entity.
/// </summary>
public class SurveyQuestionDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("questionKey")]
    public string QuestionKey { get; set; } = string.Empty;

    [JsonPropertyName("revisionNumber")]
    public int RevisionNumber { get; set; } = 1;

    [JsonPropertyName("questionType")]
    public string QuestionType { get; set; } = "single_select"; // "single_select" | "multi_select" | "likert" | "text_input"

    [JsonPropertyName("aspectRatio")]
    public string AspectRatio { get; set; } = "1:1"; // "1:1" | "3:4" | "4:3" | "9:16"

    [JsonPropertyName("mediaFormat")]
    public string MediaFormat { get; set; } = "icon"; // "icon" | "image" | "none"

    [JsonPropertyName("points")]
    public int Points { get; set; } = 175;

    [JsonPropertyName("statements")]
    public QuestionStatementsDto Statements { get; set; } = new();

    [JsonPropertyName("options")]
    public List<SurveyOptionDto> Options { get; set; } = new();

    [JsonPropertyName("validationRules")]
    public JsonElement? ValidationRules { get; set; }
}

/// <summary>
/// Multilingual statement verses for a question.
/// Dictionary keys are ISO codes: "en", "te", "hi", "ta", "ml", "kn".
/// </summary>
public class QuestionStatementsDto
{
    [JsonPropertyName("title")]
    public Dictionary<string, string> Title { get; set; } = new();

    [JsonPropertyName("subtitle")]
    public Dictionary<string, string> Subtitle { get; set; } = new();

    [JsonPropertyName("kicker")]
    public Dictionary<string, string> Kicker { get; set; } = new();
}

/// <summary>
/// Option item with localized text, visual icon, and answer-based branching target.
/// </summary>
public class SurveyOptionDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("statements")]
    public Dictionary<string, string> Statements { get; set; } = new();

    [JsonPropertyName("title")]
    public Dictionary<string, string>? Title
    {
        get => Statements;
        set { if (value != null && Statements.Count == 0) Statements = value; }
    }

    [JsonPropertyName("label")]
    public Dictionary<string, string>? Label
    {
        get => Statements;
        set { if (value != null && Statements.Count == 0) Statements = value; }
    }

    [JsonPropertyName("subtitleStatements")]
    public Dictionary<string, string>? SubtitleStatements { get; set; }

    [JsonPropertyName("subtitle")]
    public Dictionary<string, string>? Subtitle
    {
        get => SubtitleStatements;
        set { if (value != null) SubtitleStatements = value; }
    }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; } // Reference to 47-icon catalog ID e.g. "crown", "sparkles"

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("colorHex")]
    public string? ColorHex { get; set; }

    [JsonPropertyName("nextQuestionKey")]
    public string? NextQuestionKey { get; set; } // Answer-based branching target
}

/// <summary>
/// Mapping of a question revision into a specific survey version sequence.
/// </summary>
public class SurveyVersionQuestionMappingDto
{
    [JsonPropertyName("questionId")]
    public Guid QuestionId { get; set; }

    [JsonPropertyName("sequenceOrder")]
    public int SequenceOrder { get; set; }

    [JsonPropertyName("defaultNextQuestionKey")]
    public string? DefaultNextQuestionKey { get; set; }

    [JsonPropertyName("isTerminalQuestion")]
    public bool IsTerminalQuestion { get; set; }

    [JsonPropertyName("question")]
    public SurveyQuestionDto Question { get; set; } = new();
}

/// <summary>
/// Client submission payload.
/// </summary>
public class SubmitSurveyResponseRequest
{
    [JsonPropertyName("versionNumber")]
    public int VersionNumber { get; set; }

    [JsonPropertyName("virtualUserId")]
    public string VirtualUserId { get; set; } = string.Empty;

    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("language")]
    public string Language { get; set; } = "en";

    [JsonPropertyName("originRoute")]
    public string OriginRoute { get; set; } = string.Empty;

    [JsonPropertyName("answers")]
    public Dictionary<string, JsonElement> Answers { get; set; } = new();

    [JsonPropertyName("hiddenFields")]
    public Dictionary<string, string>? HiddenFields { get; set; }
}

/// <summary>
/// Result returned synchronously upon survey submission with wallet update.
/// </summary>
public class SubmitSurveyResponseResult
{
    [JsonPropertyName("responseId")]
    public Guid ResponseId { get; set; }

    [JsonPropertyName("surveyId")]
    public Guid SurveyId { get; set; }

    [JsonPropertyName("versionNumber")]
    public int VersionNumber { get; set; }

    [JsonPropertyName("questionsAnsweredCount")]
    public int QuestionsAnsweredCount { get; set; }

    [JsonPropertyName("earnedMudras")]
    public int EarnedMudras { get; set; }

    [JsonPropertyName("newWalletBalance")]
    public int NewWalletBalance { get; set; }

    [JsonPropertyName("vipPassCode")]
    public string VipPassCode { get; set; } = string.Empty;

    [JsonPropertyName("submittedAt")]
    public DateTime SubmittedAt { get; set; }
}

/// <summary>
/// Summary response row for admin visualizer table.
/// </summary>
public class SurveyResponseListItemDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("surveyId")]
    public Guid SurveyId { get; set; }

    [JsonPropertyName("versionNumber")]
    public int VersionNumber { get; set; }

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("virtualUserId")]
    public string VirtualUserId { get; set; } = string.Empty;

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("language")]
    public string Language { get; set; } = "en";

    [JsonPropertyName("questionsAnsweredCount")]
    public int QuestionsAnsweredCount { get; set; }

    [JsonPropertyName("earnedMudras")]
    public int EarnedMudras { get; set; }

    [JsonPropertyName("originRoute")]
    public string? OriginRoute { get; set; }

    [JsonPropertyName("submittedAt")]
    public DateTime SubmittedAt { get; set; }
}

/// <summary>
/// Detailed single-response inspector payload for Admin Deep-Dive card.
/// </summary>
public class SurveyResponseDetailDto : SurveyResponseListItemDto
{
    [JsonPropertyName("answers")]
    public Dictionary<string, JsonElement> Answers { get; set; } = new();

    [JsonPropertyName("hiddenFields")]
    public Dictionary<string, string> HiddenFields { get; set; } = new();
}

/// <summary>
/// Admin payload to create a new root survey.
/// </summary>
public class AdminCreateSurveyRequest
{
    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = "taste_profile";

    [JsonPropertyName("audienceType")]
    public string AudienceType { get; set; } = "guest";

    [JsonPropertyName("defaultLanguage")]
    public string DefaultLanguage { get; set; } = "en";
}

/// <summary>
/// Admin payload to publish working draft into a new version.
/// </summary>
public class AdminPublishVersionRequest
{
    [JsonPropertyName("versionComment")]
    public string VersionComment { get; set; } = string.Empty;

    [JsonPropertyName("publishedBy")]
    public string? PublishedBy { get; set; }
}

/// <summary>
/// Customer wallet summary.
/// </summary>
public class CustomerWalletSummaryDto
{
    [JsonPropertyName("virtualUserId")]
    public string VirtualUserId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("balance")]
    public int Balance { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Fine-grained validation rules for file upload questions.
/// </summary>
public class FileUploadValidationRulesDto
{
    [JsonPropertyName("minFiles")]
    public int MinFiles { get; set; } = 0; // 0 = optional, 1+ = required

    [JsonPropertyName("maxFiles")]
    public int MaxFiles { get; set; } = 1;

    [JsonPropertyName("maxFileSizeMb")]
    public int MaxFileSizeMb { get; set; } = 10;

    [JsonPropertyName("minFileSizeKb")]
    public int MinFileSizeKb { get; set; } = 5;

    [JsonPropertyName("allowedMimeTypes")]
    public List<string> AllowedMimeTypes { get; set; } = new()
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    [JsonPropertyName("allowedExtensions")]
    public List<string> AllowedExtensions { get; set; } = new()
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    [JsonPropertyName("captureMode")]
    public string CaptureMode { get; set; } = "camera_or_gallery"; // "camera_only" | "gallery_only" | "camera_or_gallery" | "document"
}

/// <summary>
/// Request to generate a single-use presigned upload ticket into customer-vault.
/// </summary>
public class GenerateSurveyUploadTicketRequest
{
    [JsonPropertyName("questionKey")]
    public string QuestionKey { get; set; } = string.Empty;

    [JsonPropertyName("virtualUserId")]
    public string VirtualUserId { get; set; } = string.Empty;

    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("contentType")]
    public string ContentType { get; set; } = string.Empty;

    [JsonPropertyName("fileSizeBytes")]
    public long FileSizeBytes { get; set; }
}

/// <summary>
/// Result containing the presigned upload URL and storage key.
/// </summary>
public class SurveyUploadTicketResultDto
{
    [JsonPropertyName("uploadUrl")]
    public string UploadUrl { get; set; } = string.Empty;

    [JsonPropertyName("fileKey")]
    public string FileKey { get; set; } = string.Empty;

    [JsonPropertyName("bucket")]
    public string Bucket { get; set; } = string.Empty;

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }
}

/// <summary>
/// Descriptor of an uploaded file within survey response answers.
/// </summary>
public class SurveyFileUploadItemDto
{
    [JsonPropertyName("fileKey")]
    public string FileKey { get; set; } = string.Empty;

    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("contentType")]
    public string ContentType { get; set; } = string.Empty;

    [JsonPropertyName("fileSizeBytes")]
    public long FileSizeBytes { get; set; }

    [JsonPropertyName("downloadUrl")]
    public string? DownloadUrl { get; set; } // Populated for admin inspection
}

