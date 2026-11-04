using System.Diagnostics;
using System.Text.Json;
using Dapper;
using Npgsql;
using Store.Api.Models;

namespace Store.Api.Services;

public class SurveyService : ISurveyService
{
    private static readonly ActivitySource Source = new("DeepLens.Store.Survey");
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly string _connectionString;
    private readonly IMediaStorageService _mediaStorageService;
    private readonly string _customerVaultBucket;
    private readonly ILogger<SurveyService> _logger;

    public SurveyService(
        IMediaStorageService mediaStorageService,
        IConfiguration config, 
        ILogger<SurveyService> logger)
    {
        _mediaStorageService = mediaStorageService;
        _logger = logger;
        _connectionString = config.GetConnectionString("StoreDb")
            ?? config["ConnectionStrings:StoreDb"]
            ?? config["ConnectionStrings__StoreDb"]
            ?? "Host=localhost;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

        _customerVaultBucket = config["Minio:CustomerVaultBucket"]
            ?? config["Minio__CustomerVaultBucket"]
            ?? "customer-vault";
    }

    private NpgsqlConnection CreateConnection() => new(_connectionString);

    public async Task<SurveyVersionDto?> GetSurveyBySlugAsync(string slug, int? versionNumber = null, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.GetSurveyBySlug");
        activity?.SetTag("survey.slug", slug);
        activity?.SetTag("survey.version_requested", versionNumber);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        // 1. Get root survey
        const string surveySql = @"
            SELECT id, slug, title, description, category, audience_type, default_language, has_uncommitted_draft
            FROM surveys
            WHERE slug = @slug
            LIMIT 1;
        ";
        var survey = await conn.QuerySingleOrDefaultAsync<dynamic>(surveySql, new { slug });
        if (survey == null)
        {
            _logger.LogWarning("Survey with slug '{Slug}' not found", slug);
            return null;
        }

        Guid surveyId = survey.id;

        // 2. Get survey version (specified or latest non-archived)
        string versionSql = versionNumber.HasValue
            ? @"SELECT id, survey_id, version_number, version_comment, theme_id, cover_page_json, hidden_fields_config,
                       points_per_question, total_mudras_target, is_archived, published_by, published_at
                FROM survey_versions
                WHERE survey_id = @surveyId AND version_number = @versionNumber
                LIMIT 1;"
            : @"SELECT id, survey_id, version_number, version_comment, theme_id, cover_page_json, hidden_fields_config,
                       points_per_question, total_mudras_target, is_archived, published_by, published_at
                FROM survey_versions
                WHERE survey_id = @surveyId AND is_archived = FALSE
                ORDER BY version_number DESC
                LIMIT 1;";

        var ver = await conn.QuerySingleOrDefaultAsync<dynamic>(versionSql, new { surveyId, versionNumber });
        if (ver == null)
        {
            _logger.LogWarning("No active published version found for survey '{Slug}'", slug);
            return null;
        }

        Guid versionId = ver.id;

        // 3. Get ordered questions with revisions
        const string questionsSql = @"
            SELECT 
                svq.question_id, svq.sequence_order, svq.default_next_question_key, svq.is_terminal_question,
                sq.id, sq.question_key, sq.revision_number, sq.question_type, sq.aspect_ratio, sq.media_format, sq.points,
                sq.statements_json, sq.options_json, sq.validation_rules_json
            FROM survey_version_questions svq
            JOIN survey_questions sq ON svq.question_id = sq.id
            WHERE svq.survey_version_id = @versionId
            ORDER BY svq.sequence_order ASC;
        ";

        var questionRows = await conn.QueryAsync<dynamic>(questionsSql, new { versionId });

        var versionDto = new SurveyVersionDto
        {
            Id = ver.id,
            SurveyId = ver.survey_id,
            VersionNumber = ver.version_number,
            VersionComment = ver.version_comment ?? string.Empty,
            ThemeId = ver.theme_id ?? "ivory-editorial",
            PointsPerQuestion = ver.points_per_question ?? 175,
            TotalMudrasTarget = ver.total_mudras_target ?? 700,
            IsArchived = ver.is_archived ?? false,
            PublishedBy = ver.published_by,
            PublishedAt = ver.published_at ?? DateTime.UtcNow,
            CoverPage = ver.cover_page_json != null ? JsonSerializer.Deserialize<SurveyCoverPageConfigDto>((string)ver.cover_page_json.ToString(), JsonOptions) : null,
            HiddenFields = ver.hidden_fields_config != null ? JsonSerializer.Deserialize<List<SurveyHiddenFieldConfigDto>>((string)ver.hidden_fields_config.ToString(), JsonOptions) : new List<SurveyHiddenFieldConfigDto>()
        };

        foreach (var row in questionRows)
        {
            var statements = row.statements_json != null
                ? JsonSerializer.Deserialize<QuestionStatementsDto>((string)row.statements_json.ToString(), JsonOptions) ?? new QuestionStatementsDto()
                : new QuestionStatementsDto();

            var options = row.options_json != null
                ? JsonSerializer.Deserialize<List<SurveyOptionDto>>((string)row.options_json.ToString(), JsonOptions) ?? new List<SurveyOptionDto>()
                : new List<SurveyOptionDto>();

            JsonElement? validationRules = null;
            if (row.validation_rules_json != null)
            {
                validationRules = JsonSerializer.Deserialize<JsonElement>(row.validation_rules_json.ToString());
            }

            var questionDto = new SurveyQuestionDto
            {
                Id = row.id,
                QuestionKey = row.question_key,
                RevisionNumber = row.revision_number,
                QuestionType = row.question_type,
                AspectRatio = row.aspect_ratio ?? "1:1",
                MediaFormat = row.media_format ?? "icon",
                Points = row.points ?? 175,
                Statements = statements,
                Options = options,
                ValidationRules = validationRules
            };

            versionDto.Questions.Add(new SurveyVersionQuestionMappingDto
            {
                QuestionId = row.question_id,
                SequenceOrder = row.sequence_order,
                DefaultNextQuestionKey = row.default_next_question_key,
                IsTerminalQuestion = row.is_terminal_question ?? false,
                Question = questionDto
            });
        }

        activity?.SetTag("survey.questions_count", versionDto.Questions.Count);
        return versionDto;
    }

    public async Task<SurveyUploadTicketResultDto> GenerateUploadTicketAsync(string slug, GenerateSurveyUploadTicketRequest request, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.GenerateUploadTicket");
        activity?.SetTag("survey.slug", slug);
        activity?.SetTag("survey.question_key", request.QuestionKey);
        activity?.SetTag("survey.virtual_user_id", request.VirtualUserId);

        if (string.IsNullOrWhiteSpace(request.VirtualUserId))
        {
            throw new ArgumentException("virtualUserId is required to generate an upload ticket.");
        }
        if (string.IsNullOrWhiteSpace(request.QuestionKey))
        {
            throw new ArgumentException("questionKey is required to generate an upload ticket.");
        }
        if (string.IsNullOrWhiteSpace(request.FileName))
        {
            throw new ArgumentException("fileName is required.");
        }

        // 1. Get active survey version and question configuration
        var survey = await GetSurveyBySlugAsync(slug, null, ct);
        if (survey == null)
        {
            throw new InvalidOperationException($"Survey '{slug}' not found.");
        }

        var questionMapping = survey.Questions.FirstOrDefault(q => 
            string.Equals(q.Question.QuestionKey, request.QuestionKey, StringComparison.OrdinalIgnoreCase));

        if (questionMapping == null)
        {
            throw new InvalidOperationException($"Question '{request.QuestionKey}' not found in survey '{slug}'.");
        }

        var question = questionMapping.Question;
        if (!string.Equals(question.QuestionType, "file_upload", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Question '{request.QuestionKey}' is of type '{question.QuestionType}', not 'file_upload'.");
        }

        // 2. Parse and evaluate validation rules
        FileUploadValidationRulesDto rules = new();
        if (question.ValidationRules.HasValue)
        {
            try
            {
                rules = JsonSerializer.Deserialize<FileUploadValidationRulesDto>(
                    question.ValidationRules.Value.GetRawText(), JsonOptions) ?? new();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse validation rules for question {QuestionKey}; using defaults.", request.QuestionKey);
            }
        }

        // Validate MIME type
        var contentType = request.ContentType?.Trim().ToLowerInvariant() ?? string.Empty;
        if (rules.AllowedMimeTypes.Count > 0 && !rules.AllowedMimeTypes.Any(m => string.Equals(m, contentType, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"Content type '{request.ContentType}' is not permitted. Allowed: {string.Join(", ", rules.AllowedMimeTypes)}");
        }

        // Validate Extension
        var ext = Path.GetExtension(request.FileName)?.ToLowerInvariant() ?? string.Empty;
        if (rules.AllowedExtensions.Count > 0 && !rules.AllowedExtensions.Any(e => string.Equals(e, ext, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"File extension '{ext}' is not permitted. Allowed: {string.Join(", ", rules.AllowedExtensions)}");
        }

        // Validate File Size Limits
        long maxBytes = (long)rules.MaxFileSizeMb * 1024 * 1024;
        long minBytes = (long)rules.MinFileSizeKb * 1024;
        if (request.FileSizeBytes > maxBytes)
        {
            throw new InvalidOperationException($"File size ({request.FileSizeBytes} bytes) exceeds maximum limit of {rules.MaxFileSizeMb} MB.");
        }
        if (request.FileSizeBytes > 0 && request.FileSizeBytes < minBytes)
        {
            throw new InvalidOperationException($"File size ({request.FileSizeBytes} bytes) is below minimum required size of {rules.MinFileSizeKb} KB.");
        }

        // 3. Build unique storage key in customer-vault
        // Pattern: surveys/{surveySlug}/{virtualUserId}/{questionKey}/{guid}_{safeFileName}
        var sanitizedFileName = Path.GetFileName(request.FileName).Replace(" ", "_");
        var fileGuid = Guid.NewGuid().ToString("N")[..8];
        var objectKey = $"surveys/{slug}/{request.VirtualUserId}/{request.QuestionKey}/{fileGuid}_{sanitizedFileName}";

        const int ttlSeconds = 900; // 15 minutes
        var presignedUrl = await _mediaStorageService.GeneratePresignedUploadUrlAsync(_customerVaultBucket, objectKey, ttlSeconds);

        return new SurveyUploadTicketResultDto
        {
            UploadUrl = presignedUrl,
            FileKey = objectKey,
            Bucket = _customerVaultBucket,
            ExpiresAt = DateTime.UtcNow.AddSeconds(ttlSeconds)
        };
    }

    public async Task<SubmitSurveyResponseResult> SubmitSurveyResponseAsync(string slug, SubmitSurveyResponseRequest request, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.SubmitSurveyResponse");
        activity?.SetTag("survey.slug", slug);
        activity?.SetTag("survey.version", request.VersionNumber);
        activity?.SetTag("survey.virtual_user_id", request.VirtualUserId);
        activity?.SetTag("survey.user_id", request.UserId);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            // 1. Validate survey version and obtain points config
            const string verifySql = @"
                SELECT s.id AS survey_id, sv.id AS version_id, sv.points_per_question, sv.total_mudras_target
                FROM surveys s
                JOIN survey_versions sv ON s.id = sv.survey_id
                WHERE s.slug = @slug AND sv.version_number = @versionNumber
                LIMIT 1;
            ";
            var meta = await conn.QuerySingleOrDefaultAsync<dynamic>(verifySql, new { slug, versionNumber = request.VersionNumber }, tx);
            if (meta == null)
            {
                throw new InvalidOperationException($"Survey '{slug}' version {request.VersionNumber} does not exist.");
            }

            Guid surveyId = meta.survey_id;
            int pointsPerQuestion = meta.points_per_question ?? 175;
            int questionsAnsweredCount = request.Answers?.Count ?? 0;
            int earnedMudras = questionsAnsweredCount * pointsPerQuestion;
            Guid responseId = Guid.NewGuid();

            // 1b. Validate file_upload questions (file count, format & physical object existence in customer vault)
            const string questionsValidationSql = @"
                SELECT sq.question_key, sq.question_type, sq.validation_rules_json
                FROM survey_version_questions svq
                JOIN survey_questions sq ON svq.question_id = sq.id
                WHERE svq.survey_version_id = @versionId;";
            var qRows = await conn.QueryAsync<dynamic>(questionsValidationSql, new { versionId = (Guid)meta.version_id }, tx);
            foreach (var qRow in qRows)
            {
                string qType = qRow.question_type;
                string qKey = qRow.question_key;
                if (string.Equals(qType, "file_upload", StringComparison.OrdinalIgnoreCase))
                {
                    FileUploadValidationRulesDto rules = new();
                    if (qRow.validation_rules_json != null)
                    {
                        try
                        {
                            string jsonText = (string)qRow.validation_rules_json.ToString();
                            rules = JsonSerializer.Deserialize<FileUploadValidationRulesDto>(jsonText, JsonOptions) ?? new FileUploadValidationRulesDto();
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to parse validation rules for {QuestionKey}", qKey);
                        }
                    }

                    List<SurveyFileUploadItemDto> uploadedFiles = new();
                    if (request.Answers != null && request.Answers.TryGetValue(qKey, out var answerElement))
                    {
                        uploadedFiles = ParseFileList(answerElement);
                    }

                    if (rules.MinFiles > 0 && uploadedFiles.Count < rules.MinFiles)
                    {
                        throw new InvalidOperationException($"Question '{qKey}' requires at least {rules.MinFiles} file(s), but received {uploadedFiles.Count}.");
                    }
                    if (uploadedFiles.Count > rules.MaxFiles)
                    {
                        throw new InvalidOperationException($"Question '{qKey}' allows at most {rules.MaxFiles} file(s), but received {uploadedFiles.Count}.");
                    }

                    foreach (var f in uploadedFiles)
                    {
                        if (string.IsNullOrWhiteSpace(f.FileKey))
                        {
                            throw new InvalidOperationException($"Question '{qKey}' contains a file entry with missing fileKey.");
                        }

                        bool exists = await _mediaStorageService.CheckObjectExistsAsync(_customerVaultBucket, f.FileKey, ct);
                        if (!exists)
                        {
                            throw new InvalidOperationException($"Uploaded file '{f.FileKey}' for question '{qKey}' does not exist in customer vault.");
                        }
                    }
                }
            }

            string answersJson = JsonSerializer.Serialize(request.Answers ?? new(), JsonOptions);
            string hiddenFieldsJson = JsonSerializer.Serialize(request.HiddenFields ?? new(), JsonOptions);

            // 2. Insert into generic survey_responses
            const string insertResponseSql = @"
                INSERT INTO survey_responses (
                    id, survey_id, version_number, user_id, virtual_user_id, device_id, phone,
                    language, questions_answered_count, earned_mudras, answers_json, hidden_fields_json,
                    origin_route, submitted_at
                ) VALUES (
                    @id, @surveyId, @versionNumber, @userId, @virtualUserId, @deviceId, @phone,
                    @language, @questionsAnsweredCount, @earnedMudras, @answersJson::jsonb, @hiddenFieldsJson::jsonb,
                    @originRoute, NOW()
                ) RETURNING id, submitted_at;
            ";

            var responseRecord = await conn.QuerySingleAsync<dynamic>(insertResponseSql, new
            {
                id = responseId,
                surveyId,
                versionNumber = request.VersionNumber,
                userId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId,
                virtualUserId = request.VirtualUserId,
                deviceId = request.DeviceId,
                phone = request.Phone,
                language = request.Language ?? "en",
                questionsAnsweredCount,
                earnedMudras,
                answersJson,
                hiddenFieldsJson,
                originRoute = request.OriginRoute ?? "organic"
            }, tx);

            DateTime submittedAt = responseRecord.submitted_at;

            // 3. Synchronous Wallet Upsert
            const string upsertWalletSql = @"
                INSERT INTO store_customer_wallets (virtual_user_id, user_id, balance, updated_at)
                VALUES (@virtualUserId, @userId, @earnedMudras, NOW())
                ON CONFLICT (virtual_user_id) DO UPDATE
                SET balance = store_customer_wallets.balance + EXCLUDED.balance,
                    user_id = COALESCE(EXCLUDED.user_id, store_customer_wallets.user_id),
                    updated_at = NOW()
                RETURNING balance;
            ";

            int newWalletBalance = await conn.QuerySingleAsync<int>(upsertWalletSql, new
            {
                virtualUserId = request.VirtualUserId,
                userId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId,
                earnedMudras
            }, tx);

            // 4. Audit ledger entry
            const string insertTxSql = @"
                INSERT INTO store_wallet_transactions (
                    virtual_user_id, user_id, amount, transaction_type, reference_id, notes, created_at
                ) VALUES (
                    @virtualUserId, @userId, @earnedMudras, 'survey_reward', @responseId, @notes, NOW()
                );
            ";

            await conn.ExecuteAsync(insertTxSql, new
            {
                virtualUserId = request.VirtualUserId,
                userId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId,
                earnedMudras,
                responseId,
                notes = $"Survey {slug} (v{request.VersionNumber}) reward: {questionsAnsweredCount} questions answered"
            }, tx);

            await tx.CommitAsync(ct);

            string vipPassCode = $"VIP-MINT-{responseId.ToString()[..8].ToUpperInvariant()}";

            activity?.SetTag("survey.earned_mudras", earnedMudras);
            activity?.SetTag("survey.new_balance", newWalletBalance);

            return new SubmitSurveyResponseResult
            {
                ResponseId = responseId,
                SurveyId = surveyId,
                VersionNumber = request.VersionNumber,
                QuestionsAnsweredCount = questionsAnsweredCount,
                EarnedMudras = earnedMudras,
                NewWalletBalance = newWalletBalance,
                VipPassCode = vipPassCode,
                SubmittedAt = submittedAt
            };
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to submit survey response for {Slug} v{Version}", slug, request.VersionNumber);
            throw;
        }
    }

    public async Task<CustomerWalletSummaryDto> GetWalletBalanceAsync(string virtualUserId, string? userId = null, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.GetWalletBalance");
        activity?.SetTag("wallet.virtual_user_id", virtualUserId);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT virtual_user_id, user_id, balance, updated_at
            FROM store_customer_wallets
            WHERE virtual_user_id = @virtualUserId
               OR (@userId IS NOT NULL AND user_id = @userId)
            ORDER BY updated_at DESC
            LIMIT 1;
        ";

        var row = await conn.QuerySingleOrDefaultAsync<dynamic>(sql, new { virtualUserId, userId });
        if (row == null)
        {
            return new CustomerWalletSummaryDto
            {
                VirtualUserId = virtualUserId,
                UserId = userId,
                Balance = 0,
                UpdatedAt = DateTime.UtcNow
            };
        }

        return new CustomerWalletSummaryDto
        {
            VirtualUserId = row.virtual_user_id,
            UserId = row.user_id,
            Balance = row.balance ?? 0,
            UpdatedAt = row.updated_at ?? DateTime.UtcNow
        };
    }

    public async Task<List<SurveyDto>> ListSurveysAsync(CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.ListSurveys");

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT 
                s.id, s.slug, s.title, s.description, s.category, s.audience_type, s.default_language,
                s.has_uncommitted_draft, s.created_at, s.updated_at,
                COALESCE(MAX(sv.version_number), 0) AS latest_version_number
            FROM surveys s
            LEFT JOIN survey_versions sv ON s.id = sv.survey_id
            GROUP BY s.id
            ORDER BY s.updated_at DESC;
        ";

        var rows = await conn.QueryAsync<dynamic>(sql);
        var list = new List<SurveyDto>();

        foreach (var r in rows)
        {
            list.Add(new SurveyDto
            {
                Id = r.id,
                Slug = r.slug,
                Title = r.title,
                Description = r.description,
                Category = r.category ?? "taste_profile",
                AudienceType = r.audience_type ?? "guest",
                DefaultLanguage = r.default_language ?? "en",
                HasUncommittedDraft = r.has_uncommitted_draft ?? false,
                LatestVersionNumber = (int)(r.latest_version_number ?? 0),
                CreatedAt = r.created_at ?? DateTime.UtcNow,
                UpdatedAt = r.updated_at ?? DateTime.UtcNow
            });
        }

        return list;
    }

    public async Task<SurveyDto?> GetSurveyMetadataAsync(Guid surveyId, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.GetSurveyMetadata");
        activity?.SetTag("survey.id", surveyId);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT 
                s.id, s.slug, s.title, s.description, s.category, s.audience_type, s.default_language,
                s.has_uncommitted_draft, s.created_at, s.updated_at,
                COALESCE(MAX(sv.version_number), 0) AS latest_version_number
            FROM surveys s
            LEFT JOIN survey_versions sv ON s.id = sv.survey_id
            WHERE s.id = @surveyId
            GROUP BY s.id;
        ";

        var r = await conn.QuerySingleOrDefaultAsync<dynamic>(sql, new { surveyId });
        if (r == null) return null;

        return new SurveyDto
        {
            Id = r.id,
            Slug = r.slug,
            Title = r.title,
            Description = r.description,
            Category = r.category ?? "taste_profile",
            AudienceType = r.audience_type ?? "guest",
            DefaultLanguage = r.default_language ?? "en",
            HasUncommittedDraft = r.has_uncommitted_draft ?? false,
            LatestVersionNumber = (int)(r.latest_version_number ?? 0),
            CreatedAt = r.created_at ?? DateTime.UtcNow,
            UpdatedAt = r.updated_at ?? DateTime.UtcNow
        };
    }

    public async Task<bool> UpdateDraftSchemaAsync(Guid surveyId, JsonElement draftSchema, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.UpdateDraftSchema");
        activity?.SetTag("survey.id", surveyId);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        const string sql = @"
            UPDATE surveys
            SET draft_schema_json = @draftJson::jsonb,
                has_uncommitted_draft = TRUE,
                updated_at = NOW()
            WHERE id = @surveyId;
        ";

        int affected = await conn.ExecuteAsync(sql, new
        {
            surveyId,
            draftJson = JsonSerializer.Serialize(draftSchema, JsonOptions)
        });

        return affected > 0;
    }

    public async Task<SurveyVersionDto> PublishVersionAsync(Guid surveyId, AdminPublishVersionRequest request, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.PublishVersion");
        activity?.SetTag("survey.id", surveyId);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            // 1. Get next sequential version number
            const string nextVerSql = @"
                SELECT COALESCE(MAX(version_number), 0) + 1 FROM survey_versions WHERE survey_id = @surveyId;
            ";
            int nextVersion = await conn.QuerySingleAsync<int>(nextVerSql, new { surveyId }, tx);

            // 2. Fetch working draft
            const string draftSql = @"SELECT draft_schema_json FROM surveys WHERE id = @surveyId;";
            var draftJsonStr = await conn.QuerySingleOrDefaultAsync<string>(draftSql, new { surveyId }, tx);

            Guid versionId = Guid.NewGuid();
            string themeId = "ivory-editorial";
            int pointsPerQuestion = 175;
            int totalMudrasTarget = 700;
            string coverPageJson = "{}";
            string hiddenFieldsConfigJson = "[]";

            if (!string.IsNullOrWhiteSpace(draftJsonStr))
            {
                using var draftDoc = JsonDocument.Parse(draftJsonStr);
                var root = draftDoc.RootElement;
                if (root.TryGetProperty("themeId", out var t)) themeId = t.GetString() ?? themeId;
                if (root.TryGetProperty("pointsPerQuestion", out var p)) pointsPerQuestion = p.GetInt32();
                if (root.TryGetProperty("totalMudrasTarget", out var tm)) totalMudrasTarget = tm.GetInt32();
                if (root.TryGetProperty("coverPage", out var cp)) coverPageJson = cp.GetRawText();
                if (root.TryGetProperty("hiddenFields", out var hf)) hiddenFieldsConfigJson = hf.GetRawText();
            }

            // 3. Insert immutable version snapshot
            const string insertVerSql = @"
                INSERT INTO survey_versions (
                    id, survey_id, version_number, version_comment, theme_id,
                    cover_page_json, hidden_fields_config, points_per_question, total_mudras_target,
                    published_by, published_at
                ) VALUES (
                    @id, @surveyId, @nextVersion, @versionComment, @themeId,
                    @coverPageJson::jsonb, @hiddenFieldsConfigJson::jsonb, @pointsPerQuestion, @totalMudrasTarget,
                    @publishedBy, NOW()
                ) RETURNING *;
            ";

            await conn.ExecuteAsync(insertVerSql, new
            {
                id = versionId,
                surveyId,
                nextVersion,
                versionComment = request.VersionComment,
                themeId,
                coverPageJson,
                hiddenFieldsConfigJson,
                pointsPerQuestion,
                totalMudrasTarget,
                publishedBy = request.PublishedBy ?? "system_admin"
            }, tx);

            // 4. Mark survey uncommitted draft as false
            const string clearDraftSql = @"
                UPDATE surveys
                SET has_uncommitted_draft = FALSE,
                    updated_at = NOW()
                WHERE id = @surveyId;
            ";
            await conn.ExecuteAsync(clearDraftSql, new { surveyId }, tx);

            await tx.CommitAsync(ct);

            _logger.LogInformation("Successfully published Survey {SurveyId} Version {Version}", surveyId, nextVersion);

            // Fetch and return the newly published version
            const string getSlugSql = "SELECT slug FROM surveys WHERE id = @surveyId;";
            string slug = await conn.QuerySingleAsync<string>(getSlugSql, new { surveyId });
            return (await GetSurveyBySlugAsync(slug, nextVersion, ct))!;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to publish new version for survey {SurveyId}", surveyId);
            throw;
        }
    }

    public async Task<List<SurveyResponseListItemDto>> ListResponsesAsync(Guid surveyId, int? versionNumber, int limit = 50, int offset = 0, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.ListResponses");
        activity?.SetTag("survey.id", surveyId);
        activity?.SetTag("survey.version", versionNumber);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        string sql = versionNumber.HasValue
            ? @"SELECT id, survey_id, version_number, user_id, virtual_user_id, phone, language,
                       questions_answered_count, earned_mudras, origin_route, submitted_at
                FROM survey_responses
                WHERE survey_id = @surveyId AND version_number = @versionNumber
                ORDER BY submitted_at DESC
                LIMIT @limit OFFSET @offset;"
            : @"SELECT id, survey_id, version_number, user_id, virtual_user_id, phone, language,
                       questions_answered_count, earned_mudras, origin_route, submitted_at
                FROM survey_responses
                WHERE survey_id = @surveyId
                ORDER BY submitted_at DESC
                LIMIT @limit OFFSET @offset;";

        var rows = await conn.QueryAsync<dynamic>(sql, new { surveyId, versionNumber, limit, offset });
        var list = new List<SurveyResponseListItemDto>();

        foreach (var r in rows)
        {
            list.Add(new SurveyResponseListItemDto
            {
                Id = r.id,
                SurveyId = r.survey_id,
                VersionNumber = r.version_number,
                UserId = r.user_id,
                VirtualUserId = r.virtual_user_id,
                Phone = r.phone,
                Language = r.language ?? "en",
                QuestionsAnsweredCount = r.questions_answered_count ?? 0,
                EarnedMudras = r.earned_mudras ?? 0,
                OriginRoute = r.origin_route,
                SubmittedAt = r.submitted_at ?? DateTime.UtcNow
            });
        }

        return list;
    }

    public async Task<SurveyResponseDetailDto?> GetResponseDetailAsync(Guid responseId, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("SurveyService.GetResponseDetail");
        activity?.SetTag("response.id", responseId);

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT id, survey_id, version_number, user_id, virtual_user_id, phone, language,
                   questions_answered_count, earned_mudras, origin_route, submitted_at,
                   answers_json, hidden_fields_json
            FROM survey_responses
            WHERE id = @responseId
            LIMIT 1;
        ";

        var r = await conn.QuerySingleOrDefaultAsync<dynamic>(sql, new { responseId });
        if (r == null) return null;

        var answers = r.answers_json != null
            ? JsonSerializer.Deserialize<Dictionary<string, JsonElement>>((string)r.answers_json.ToString(), JsonOptions) ?? new Dictionary<string, JsonElement>()
            : new Dictionary<string, JsonElement>();

        var hiddenFields = r.hidden_fields_json != null
            ? JsonSerializer.Deserialize<Dictionary<string, string>>((string)r.hidden_fields_json.ToString(), JsonOptions) ?? new Dictionary<string, string>()
            : new Dictionary<string, string>();

        // Dynamically resolve short-lived presigned GET URLs for any file_upload answers
        const string qTypesSql = @"
            SELECT sq.question_key
            FROM survey_version_questions svq
            JOIN survey_questions sq ON svq.question_id = sq.id
            JOIN survey_versions sv ON svq.survey_version_id = sv.id
            WHERE sv.survey_id = @surveyId AND sv.version_number = @versionNumber AND sq.question_type = 'file_upload';";
        var fileQuestions = (await conn.QueryAsync<dynamic>(qTypesSql, new { surveyId = (Guid)r.survey_id, versionNumber = (int)r.version_number })).ToList();
        var fileKeysSet = new HashSet<string>(fileQuestions.Select(q => (string)q.question_key), StringComparer.OrdinalIgnoreCase);

        var enrichedAnswers = new Dictionary<string, JsonElement>();
        foreach (var (k, v) in answers)
        {
            if (fileKeysSet.Contains(k))
            {
                try
                {
                    var files = ParseFileList(v);
                    foreach (var f in files)
                    {
                        if (!string.IsNullOrWhiteSpace(f.FileKey))
                        {
                            f.DownloadUrl = await _mediaStorageService.GeneratePresignedDownloadUrlAsync(_customerVaultBucket, f.FileKey, 3600);
                        }
                    }
                    enrichedAnswers[k] = JsonSerializer.SerializeToElement(files, JsonOptions);
                    continue;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to enrich presigned download URL for question {QuestionKey}", k);
                }
            }
            enrichedAnswers[k] = v;
        }

        return new SurveyResponseDetailDto
        {
            Id = r.id,
            SurveyId = r.survey_id,
            VersionNumber = r.version_number,
            UserId = r.user_id,
            VirtualUserId = r.virtual_user_id,
            Phone = r.phone,
            Language = r.language ?? "en",
            QuestionsAnsweredCount = r.questions_answered_count ?? 0,
            EarnedMudras = r.earned_mudras ?? 0,
            OriginRoute = r.origin_route,
            SubmittedAt = r.submitted_at ?? DateTime.UtcNow,
            Answers = enrichedAnswers,
            HiddenFields = hiddenFields
        };
    }

    private static List<SurveyFileUploadItemDto> ParseFileList(JsonElement elem)
    {
        var list = new List<SurveyFileUploadItemDto>();
        if (elem.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in elem.EnumerateArray())
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<SurveyFileUploadItemDto>(item.GetRawText(), JsonOptions);
                    if (parsed != null && !string.IsNullOrWhiteSpace(parsed.FileKey)) list.Add(parsed);
                }
                catch { }
            }
        }
        else if (elem.ValueKind == JsonValueKind.Object)
        {
            if (elem.TryGetProperty("files", out var filesProp) && filesProp.ValueKind == JsonValueKind.Array)
            {
                return ParseFileList(filesProp);
            }
            try
            {
                var single = JsonSerializer.Deserialize<SurveyFileUploadItemDto>(elem.GetRawText(), JsonOptions);
                if (single != null && !string.IsNullOrWhiteSpace(single.FileKey)) list.Add(single);
            }
            catch { }
        }
        return list;
    }
}
