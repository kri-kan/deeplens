using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Marketing;

public record MessageTemplate(
    [property: JsonPropertyName("templateName")] string TemplateName,
    [property: JsonPropertyName("languageCode")] string LanguageCode,
    [property: JsonPropertyName("body")] string Body = ""
);

public record PurposeStepDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("purposeKey")] string PurposeKey,
    [property: JsonPropertyName("stepNumber")] int StepNumber,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("messageTemplates")] IEnumerable<MessageTemplate> MessageTemplates
);

public record CreatePurposeStepRequest(
    [property: JsonPropertyName("stepNumber")] int StepNumber,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("messageTemplates")] IEnumerable<MessageTemplate> MessageTemplates
);

public record UpdatePurposeStepRequest(
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("messageTemplates")] IEnumerable<MessageTemplate> MessageTemplates
);

public record CustomerStepProgressDto(
    [property: JsonPropertyName("stepId")] Guid StepId,
    [property: JsonPropertyName("stepNumber")] int StepNumber,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("messageTemplates")] IEnumerable<MessageTemplate> MessageTemplates,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("completedAt")] DateTime? CompletedAt,
    [property: JsonPropertyName("sentMessage")] string? SentMessage
);

public record PurposeCustomerTrackingDto(
    [property: JsonPropertyName("customerId")] Guid CustomerId,
    [property: JsonPropertyName("customerName")] string CustomerName,
    [property: JsonPropertyName("phoneNumber")] string PhoneNumber,
    [property: JsonPropertyName("totalSteps")] int TotalSteps,
    [property: JsonPropertyName("completedSteps")] int CompletedSteps,
    [property: JsonPropertyName("isCompleted")] bool IsCompleted,
    [property: JsonPropertyName("assignedChannelId")] Guid? AssignedChannelId,
    [property: JsonPropertyName("assignedChannelName")] string? AssignedChannelName,
    [property: JsonPropertyName("preferredLanguages")] IEnumerable<string> PreferredLanguages,
    [property: JsonPropertyName("instagramId")] string? InstagramId,
    [property: JsonPropertyName("referralCode")] string? ReferralCode,
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("lastStepCompletedAt")] DateTime? LastStepCompletedAt
);

public record CampaignVariableDto(
    [property: JsonPropertyName("purposeKey")] string PurposeKey,
    [property: JsonPropertyName("variableKey")] string VariableKey,
    [property: JsonPropertyName("variableValue")] string VariableValue
);

public record CampaignVariableInput(
    [property: JsonPropertyName("variableKey")] string VariableKey,
    [property: JsonPropertyName("variableValue")] string VariableValue
);

public record UpsertCampaignVariablesRequest(
    [property: JsonPropertyName("variables")] IEnumerable<CampaignVariableInput> Variables
);
