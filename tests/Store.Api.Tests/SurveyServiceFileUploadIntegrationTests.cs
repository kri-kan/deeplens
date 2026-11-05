using System.Text.Json;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using NUnit.Framework;
using FluentAssertions;
using Store.Api.Models;
using Store.Api.Services;

namespace Store.Api.Tests;

[TestFixture]
public class SurveyServiceFileUploadIntegrationTests
{
    private readonly string _storeConnStr =
        Environment.GetEnvironmentVariable("STORE_DB_CONNECTION")
        ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

    private SurveyService _surveyService = null!;
    private TestMediaStorageService _mediaStorage = null!;

    private readonly Guid _testSurveyId = Guid.Parse("00000000-0000-0000-0000-000000008801");
    private readonly Guid _testVersionId = Guid.Parse("00000000-0000-0000-0000-000000008802");
    private readonly Guid _testFileQuestionId = Guid.Parse("00000000-0000-0000-0000-000000008803");
    private readonly Guid _testSelectQuestionId = Guid.Parse("00000000-0000-0000-0000-000000008804");

    private const string TestSlug = "test-upload-survey-qa";
    private const string FileQuestionKey = "q_test_defect_photo";
    private const string SelectQuestionKey = "q_test_feedback_category";

    [SetUp]
    public async Task Setup()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "ConnectionStrings:StoreDb", _storeConnStr },
            { "Minio:CustomerVaultBucket", "customer-vault" }
        };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _mediaStorage = new TestMediaStorageService();
        var logger = NullLogger<SurveyService>.Instance;

        _surveyService = new SurveyService(_mediaStorage, config, logger);

        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        // Clean previous test data
        await conn.ExecuteAsync(@"
            DELETE FROM survey_responses WHERE survey_id = @SurveyId;
            DELETE FROM survey_version_questions WHERE survey_version_id = @VersionId;
            DELETE FROM survey_versions WHERE id = @VersionId;
            DELETE FROM surveys WHERE id = @SurveyId;
            DELETE FROM survey_questions WHERE id IN (@Q1, @Q2);",
            new { SurveyId = _testSurveyId, VersionId = _testVersionId, Q1 = _testFileQuestionId, Q2 = _testSelectQuestionId });

        // 1. Insert Root Survey
        await conn.ExecuteAsync(@"
            INSERT INTO surveys (id, slug, title, description, category, audience_type, default_language, has_uncommitted_draft)
            VALUES (@Id, @Slug, 'QA Upload Survey', 'Testing file uploads and validation limits', 'taste_profile', 'guest', 'en', FALSE);",
            new { Id = _testSurveyId, Slug = TestSlug });

        // 2. Insert Survey Version (v1)
        await conn.ExecuteAsync(@"
            INSERT INTO survey_versions (id, survey_id, version_number, version_comment, theme_id, points_per_question, total_mudras_target, is_archived)
            VALUES (@Id, @SurveyId, 1, 'Initial QA Version', 'ivory-editorial', 175, 350, FALSE);",
            new { Id = _testVersionId, SurveyId = _testSurveyId });

        // 3. Insert File Upload Question with validation rules (minFiles: 1, maxFiles: 2, maxFileSizeMb: 5, minFileSizeKb: 2)
        var fileRulesJson = JsonSerializer.Serialize(new FileUploadValidationRulesDto
        {
            MinFiles = 1,
            MaxFiles = 2,
            MaxFileSizeMb = 5,
            MinFileSizeKb = 2,
            AllowedMimeTypes = new List<string> { "image/jpeg", "image/png" },
            AllowedExtensions = new List<string> { ".jpg", ".png" },
            CaptureMode = "camera_or_gallery"
        });

        await conn.ExecuteAsync(@"
            INSERT INTO survey_questions (id, question_key, revision_number, question_type, statements_json, options_json, validation_rules_json)
            VALUES (@Id, @Key, 1, 'file_upload', '{""title"":{""en"":""Defect Photo""}}'::jsonb, '[]'::jsonb, @Rules::jsonb);",
            new { Id = _testFileQuestionId, Key = FileQuestionKey, Rules = fileRulesJson });

        // 4. Insert Single Select Question (non-file)
        await conn.ExecuteAsync(@"
            INSERT INTO survey_questions (id, question_key, revision_number, question_type, statements_json, options_json)
            VALUES (@Id, @Key, 1, 'single_select', '{""title"":{""en"":""Category""}}'::jsonb, '[]'::jsonb);",
            new { Id = _testSelectQuestionId, Key = SelectQuestionKey });

        // 5. Map Questions into Version
        await conn.ExecuteAsync(@"
            INSERT INTO survey_version_questions (id, survey_version_id, question_id, sequence_order)
            VALUES (gen_random_uuid(), @VersionId, @Q1, 1),
                   (gen_random_uuid(), @VersionId, @Q2, 2);",
            new { VersionId = _testVersionId, Q1 = _testFileQuestionId, Q2 = _testSelectQuestionId });
    }

    [TearDown]
    public async Task TearDown()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            DELETE FROM survey_responses WHERE survey_id = @SurveyId;
            DELETE FROM survey_version_questions WHERE survey_version_id = @VersionId;
            DELETE FROM survey_versions WHERE id = @VersionId;
            DELETE FROM surveys WHERE id = @SurveyId;
            DELETE FROM survey_questions WHERE id IN (@Q1, @Q2);",
            new { SurveyId = _testSurveyId, VersionId = _testVersionId, Q1 = _testFileQuestionId, Q2 = _testSelectQuestionId });
    }

    [Test]
    public async Task GenerateUploadTicket_WithDisallowedMimeType_ThrowsInvalidOperationException()
    {
        var request = new GenerateSurveyUploadTicketRequest
        {
            QuestionKey = FileQuestionKey,
            VirtualUserId = "dev_qa_user_001",
            FileName = "document.pdf",
            ContentType = "application/pdf", // Disallowed for this question (only jpeg/png allowed)
            FileSizeBytes = 100_000
        };

        var act = async () => await _surveyService.GenerateUploadTicketAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage("*Content type 'application/pdf' is not permitted*");
    }

    [Test]
    public async Task GenerateUploadTicket_WithDisallowedExtension_ThrowsInvalidOperationException()
    {
        var request = new GenerateSurveyUploadTicketRequest
        {
            QuestionKey = FileQuestionKey,
            VirtualUserId = "dev_qa_user_001",
            FileName = "malicious_script.sh",
            ContentType = "image/jpeg",
            FileSizeBytes = 100_000
        };

        var act = async () => await _surveyService.GenerateUploadTicketAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage("*File extension '.sh' is not permitted*");
    }

    [Test]
    public async Task GenerateUploadTicket_ExceedingMaxFileSize_ThrowsInvalidOperationException()
    {
        var request = new GenerateSurveyUploadTicketRequest
        {
            QuestionKey = FileQuestionKey,
            VirtualUserId = "dev_qa_user_001",
            FileName = "huge_photo.jpg",
            ContentType = "image/jpeg",
            FileSizeBytes = 8 * 1024 * 1024 // 8 MB (exceeds 5 MB limit)
        };

        var act = async () => await _surveyService.GenerateUploadTicketAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage("*exceeds maximum limit of 5 MB*");
    }

    [Test]
    public async Task GenerateUploadTicket_BelowMinFileSize_ThrowsInvalidOperationException()
    {
        var request = new GenerateSurveyUploadTicketRequest
        {
            QuestionKey = FileQuestionKey,
            VirtualUserId = "dev_qa_user_001",
            FileName = "tiny_corrupt.jpg",
            ContentType = "image/jpeg",
            FileSizeBytes = 500 // 500 bytes (below 2 KB minimum)
        };

        var act = async () => await _surveyService.GenerateUploadTicketAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage("*below minimum required size of 2 KB*");
    }

    [Test]
    public async Task GenerateUploadTicket_WhenQuestionIsNotFileUpload_ThrowsInvalidOperationException()
    {
        var request = new GenerateSurveyUploadTicketRequest
        {
            QuestionKey = SelectQuestionKey, // single_select question
            VirtualUserId = "dev_qa_user_001",
            FileName = "photo.jpg",
            ContentType = "image/jpeg",
            FileSizeBytes = 50_000
        };

        var act = async () => await _surveyService.GenerateUploadTicketAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage("*is of type 'single_select', not 'file_upload'*");
    }

    [Test]
    public async Task GenerateUploadTicket_ValidParams_ReturnsScopedPresignedPutUrl()
    {
        var request = new GenerateSurveyUploadTicketRequest
        {
            QuestionKey = FileQuestionKey,
            VirtualUserId = "dev_qa_user_001",
            FileName = "saree tear photo.jpg",
            ContentType = "image/jpeg",
            FileSizeBytes = 250_000
        };

        var result = await _surveyService.GenerateUploadTicketAsync(TestSlug, request);

        result.Should().NotBeNull();
        result.Bucket.Should().Be("customer-vault");
        result.FileKey.Should().StartWith($"surveys/{TestSlug}/dev_qa_user_001/{FileQuestionKey}/");
        result.FileKey.Should().EndWith("_saree_tear_photo.jpg");
        result.UploadUrl.Should().Contain("customer-vault");
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow.AddMinutes(14));
    }

    [Test]
    public async Task SubmitSurveyResponse_WhenRequiredFilesMissing_ThrowsInvalidOperationException()
    {
        var request = new SubmitSurveyResponseRequest
        {
            VersionNumber = 1,
            VirtualUserId = "dev_qa_user_001",
            DeviceId = "dev_device_qa",
            Answers = new Dictionary<string, JsonElement>
            {
                // File upload question omitted while minFiles = 1
                { SelectQuestionKey, JsonSerializer.SerializeToElement("Fabric") }
            }
        };

        var act = async () => await _surveyService.SubmitSurveyResponseAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage($"*Question '{FileQuestionKey}' requires at least 1 file(s)*");
    }

    [Test]
    public async Task SubmitSurveyResponse_WhenFilesExceedMaxAllowed_ThrowsInvalidOperationException()
    {
        var files = new[]
        {
            new SurveyFileUploadItemDto { FileKey = "surveys/key1.jpg", FileName = "1.jpg" },
            new SurveyFileUploadItemDto { FileKey = "surveys/key2.jpg", FileName = "2.jpg" },
            new SurveyFileUploadItemDto { FileKey = "surveys/key3.jpg", FileName = "3.jpg" } // 3 files (exceeds maxFiles: 2)
        };

        var request = new SubmitSurveyResponseRequest
        {
            VersionNumber = 1,
            VirtualUserId = "dev_qa_user_001",
            DeviceId = "dev_device_qa",
            Answers = new Dictionary<string, JsonElement>
            {
                { FileQuestionKey, JsonSerializer.SerializeToElement(files) }
            }
        };

        var act = async () => await _surveyService.SubmitSurveyResponseAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage($"*Question '{FileQuestionKey}' allows at most 2 file(s)*");
    }

    [Test]
    public async Task SubmitSurveyResponse_WhenFileNotInVault_ThrowsInvalidOperationException()
    {
        _mediaStorage.SetObjectExists(false); // Simulate file was never actually uploaded to MinIO

        var files = new[]
        {
            new SurveyFileUploadItemDto { FileKey = "surveys/ghost_file.jpg", FileName = "ghost.jpg" }
        };

        var request = new SubmitSurveyResponseRequest
        {
            VersionNumber = 1,
            VirtualUserId = "dev_qa_user_001",
            DeviceId = "dev_device_qa",
            Answers = new Dictionary<string, JsonElement>
            {
                { FileQuestionKey, JsonSerializer.SerializeToElement(files) }
            }
        };

        var act = async () => await _surveyService.SubmitSurveyResponseAsync(TestSlug, request);

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.WithMessage("*does not exist in customer vault*");
    }

    [Test]
    public async Task SubmitSurveyResponse_HappyPath_CreditsWalletAndEnrichesAdminDetail()
    {
        _mediaStorage.SetObjectExists(true); // File exists in vault

        const string expectedKey = "surveys/test-upload-survey-qa/dev_qa_user_001/q_test_defect_photo/1234_defect.jpg";
        var files = new[]
        {
            new SurveyFileUploadItemDto
            {
                FileKey = expectedKey,
                FileName = "defect.jpg",
                ContentType = "image/jpeg",
                FileSizeBytes = 150_000
            }
        };

        var request = new SubmitSurveyResponseRequest
        {
            VersionNumber = 1,
            VirtualUserId = "dev_qa_user_001",
            DeviceId = "dev_device_qa",
            Answers = new Dictionary<string, JsonElement>
            {
                { FileQuestionKey, JsonSerializer.SerializeToElement(files) }
            }
        };

        // Act - Submit Response
        var submitResult = await _surveyService.SubmitSurveyResponseAsync(TestSlug, request);

        submitResult.Should().NotBeNull();
        submitResult.QuestionsAnsweredCount.Should().Be(1);
        submitResult.EarnedMudras.Should().Be(175);

        // Act - Admin Inspection
        var detail = await _surveyService.GetResponseDetailAsync(submitResult.ResponseId);

        detail.Should().NotBeNull();
        detail!.Answers.Should().ContainKey(FileQuestionKey);

        var enrichedFiles = JsonSerializer.Deserialize<List<SurveyFileUploadItemDto>>(
            detail.Answers[FileQuestionKey].GetRawText(),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        enrichedFiles.Should().NotBeNull();
        enrichedFiles!.Should().HaveCount(1);
        enrichedFiles![0].FileKey.Should().Be(expectedKey);
        enrichedFiles[0].DownloadUrl.Should().NotBeNullOrWhiteSpace();
        enrichedFiles[0].DownloadUrl.Should().Contain("customer-vault");
        enrichedFiles[0].DownloadUrl.Should().Contain("sig=download");
    }

    private class TestMediaStorageService : IMediaStorageService
    {
        private bool _objectExists = true;

        public void SetObjectExists(bool exists) => _objectExists = exists;

        public Task<StoreMediaItemDto> IngestProductMediaAsync(Guid productId, string productCode, string sourceUrl, int order, bool isCover, string? catalogMediaId = null, CancellationToken ct = default)
            => Task.FromResult(new StoreMediaItemDto(catalogMediaId ?? Guid.NewGuid().ToString(), sourceUrl, 1, order, 0, isCover, CatalogMediaId: catalogMediaId, SourceUrl: sourceUrl));
        public Task<string> UploadModifiedMediaAsync(Guid productId, string mediaId, Stream imageStream, string mimeType, CancellationToken ct = default)
            => Task.FromResult($"http://fake-storage/{mediaId}.webp");
        public Task DeleteModifiedMediaAsync(string fileUrl, CancellationToken ct = default) => Task.CompletedTask;
        public Task EnsureBucketExistsAsync(CancellationToken ct = default) => Task.CompletedTask;
        public Task PruneOrphanedMediaAsync(Guid productId, ISet<string> survivingPublicUrls, CancellationToken ct = default) => Task.CompletedTask;

        public Task<string> GeneratePresignedUploadUrlAsync(string bucket, string objectKey, int expirySeconds = 900)
            => Task.FromResult($"http://192.168.0.170:9000/{bucket}/{objectKey}?sig=upload");

        public Task<string> GeneratePresignedDownloadUrlAsync(string bucket, string objectKey, int expirySeconds = 1800)
            => Task.FromResult($"http://192.168.0.170:9000/{bucket}/{objectKey}?sig=download");

        public Task<bool> CheckObjectExistsAsync(string bucket, string objectKey, CancellationToken ct = default)
            => Task.FromResult(_objectExists);
    }
}
