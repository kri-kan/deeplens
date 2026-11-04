using System.Text.Json;
using Store.Api.Models;

namespace Store.Api.Services;

public interface ISurveyService
{
    // Client Runtime Endpoints
    Task<SurveyVersionDto?> GetSurveyBySlugAsync(string slug, int? versionNumber = null, CancellationToken ct = default);
    Task<SurveyUploadTicketResultDto> GenerateUploadTicketAsync(string slug, GenerateSurveyUploadTicketRequest request, CancellationToken ct = default);
    Task<SubmitSurveyResponseResult> SubmitSurveyResponseAsync(string slug, SubmitSurveyResponseRequest request, CancellationToken ct = default);
    Task<CustomerWalletSummaryDto> GetWalletBalanceAsync(string virtualUserId, string? userId = null, CancellationToken ct = default);

    // Admin Operations
    Task<List<SurveyDto>> ListSurveysAsync(CancellationToken ct = default);
    Task<SurveyDto?> GetSurveyMetadataAsync(Guid surveyId, CancellationToken ct = default);
    Task<bool> UpdateDraftSchemaAsync(Guid surveyId, JsonElement draftSchema, CancellationToken ct = default);
    Task<SurveyVersionDto> PublishVersionAsync(Guid surveyId, AdminPublishVersionRequest request, CancellationToken ct = default);
    Task<List<SurveyResponseListItemDto>> ListResponsesAsync(Guid surveyId, int? versionNumber, int limit = 50, int offset = 0, CancellationToken ct = default);
    Task<SurveyResponseDetailDto?> GetResponseDetailAsync(Guid responseId, CancellationToken ct = default);
}
