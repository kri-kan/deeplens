using System.Threading;
using System.Threading.Tasks;

namespace DeepLens.Application.Abstractions.Services;

public interface ILiteLlmService
{
    /// <summary>
    /// Sends a prompt to LiteLLM Gateway and returns the completion content.
    /// </summary>
    Task<string> GetChatCompletionAsync(string prompt, string? systemPrompt = null, bool jsonMode = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks health of the LiteLLM Gateway.
    /// </summary>
    Task<bool> CheckHealthAsync(CancellationToken cancellationToken = default);
}
