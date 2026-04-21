namespace DeepLens.Application.Abstractions.IdGeneration;

public interface ISequencedIdGenerator
{
    Task<string> GetNextOrderIdAsync();
    Task<string> GetNextProductIdAsync();
}
