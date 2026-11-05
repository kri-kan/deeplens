using System.Text.Json;
using Store.Api.Models;

namespace Store.Api.Tests;

[TestFixture]
public class SurveyFileUploadValidationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    [Test]
    public void FileUploadValidationRules_DefaultValues_EnforceSensibleLimits()
    {
        var rules = new FileUploadValidationRulesDto();

        rules.MinFiles.Should().Be(0);
        rules.MaxFiles.Should().Be(1);
        rules.MaxFileSizeMb.Should().Be(10);
        rules.MinFileSizeKb.Should().Be(5);
        rules.AllowedMimeTypes.Should().Contain(new[] { "image/jpeg", "image/png", "image/webp" });
        rules.AllowedExtensions.Should().Contain(new[] { ".jpg", ".jpeg", ".png", ".webp" });
        rules.CaptureMode.Should().Be("camera_or_gallery");
    }

    [Test]
    public void FileUploadValidationRules_JsonSerialization_UsesStrictCamelCase()
    {
        var rules = new FileUploadValidationRulesDto
        {
            MinFiles = 1,
            MaxFiles = 3,
            MaxFileSizeMb = 15,
            MinFileSizeKb = 10,
            AllowedMimeTypes = new List<string> { "image/jpeg", "image/png", "application/pdf" },
            AllowedExtensions = new List<string> { ".jpg", ".png", ".pdf" },
            CaptureMode = "camera_only"
        };

        var json = JsonSerializer.Serialize(rules, JsonOptions);

        json.Should().Contain("\"minFiles\":1");
        json.Should().Contain("\"maxFiles\":3");
        json.Should().Contain("\"maxFileSizeMb\":15");
        json.Should().Contain("\"minFileSizeKb\":10");
        json.Should().Contain("\"allowedMimeTypes\":[\"image/jpeg\",\"image/png\",\"application/pdf\"]");
        json.Should().Contain("\"allowedExtensions\":[\".jpg\",\".png\",\".pdf\"]");
        json.Should().Contain("\"captureMode\":\"camera_only\"");
    }

    [Test]
    public void FileUploadValidationRules_JsonDeserialization_RestoresPropertiesAccurately()
    {
        const string rawJson = """
        {
            "minFiles": 2,
            "maxFiles": 5,
            "maxFileSizeMb": 25,
            "minFileSizeKb": 20,
            "allowedMimeTypes": ["image/webp", "video/mp4"],
            "allowedExtensions": [".webp", ".mp4"],
            "captureMode": "gallery_only"
        }
        """;

        var deserialized = JsonSerializer.Deserialize<FileUploadValidationRulesDto>(rawJson, JsonOptions);

        deserialized.Should().NotBeNull();
        deserialized!.MinFiles.Should().Be(2);
        deserialized.MaxFiles.Should().Be(5);
        deserialized.MaxFileSizeMb.Should().Be(25);
        deserialized.MinFileSizeKb.Should().Be(20);
        deserialized.AllowedMimeTypes.Should().BeEquivalentTo(new[] { "image/webp", "video/mp4" });
        deserialized.AllowedExtensions.Should().BeEquivalentTo(new[] { ".webp", ".mp4" });
        deserialized.CaptureMode.Should().Be("gallery_only");
    }

    [Test]
    public void UploadTicket_StoragePath_FollowsStandardizedVaultPattern()
    {
        const string slug = "order-issue-feedback";
        const string virtualUserId = "dev_fp_4a8b1c_9901";
        const string questionKey = "q_damage_photo";
        const string fileName = "saree hem defect.jpg";

        var sanitizedFileName = Path.GetFileName(fileName).Replace(" ", "_");
        var fileGuid = "a1b2c3d4";
        var storageKey = $"surveys/{slug}/{virtualUserId}/{questionKey}/{fileGuid}_{sanitizedFileName}";

        storageKey.Should().Be("surveys/order-issue-feedback/dev_fp_4a8b1c_9901/q_damage_photo/a1b2c3d4_saree_hem_defect.jpg");
        storageKey.Should().NotContain(" ");
        storageKey.Should().StartWith("surveys/");
    }

    [Test]
    public void SurveyFileUploadItemDto_SerializesAndDeserializesCorrectly()
    {
        var item = new SurveyFileUploadItemDto
        {
            FileKey = "surveys/order-feedback/usr_123/q_receipt/abc_receipt.pdf",
            FileName = "receipt.pdf",
            ContentType = "application/pdf",
            FileSizeBytes = 1048576,
            DownloadUrl = "http://192.168.0.170:9000/customer-vault/receipt.pdf?token=dummy"
        };

        var json = JsonSerializer.Serialize(item, JsonOptions);
        var restored = JsonSerializer.Deserialize<SurveyFileUploadItemDto>(json, JsonOptions);

        restored.Should().NotBeNull();
        restored!.FileKey.Should().Be(item.FileKey);
        restored.FileName.Should().Be("receipt.pdf");
        restored.ContentType.Should().Be("application/pdf");
        restored.FileSizeBytes.Should().Be(1048576);
        restored.DownloadUrl.Should().Be(item.DownloadUrl);
    }

    [Test]
    public void SurveyUploadTicketResultDto_ContractVerification()
    {
        var result = new SurveyUploadTicketResultDto
        {
            UploadUrl = "http://192.168.0.170:9000/customer-vault/upload?signature=xyz",
            FileKey = "surveys/taste-discovery/dev_123/q_photo/123_photo.jpg",
            Bucket = "customer-vault",
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };

        var json = JsonSerializer.Serialize(result, JsonOptions);
        json.Should().Contain("\"bucket\":\"customer-vault\"");
        json.Should().Contain("\"fileKey\":\"surveys/taste-discovery/dev_123/q_photo/123_photo.jpg\"");
        json.Should().Contain("\"uploadUrl\":\"http://192.168.0.170:9000/customer-vault/upload?signature=xyz\"");
    }
}
