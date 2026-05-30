namespace DeepLens.Application.Abstractions.IdGeneration;

public interface ISequencedIdGenerator
{
    Task<(long Id, string OrderId)> GetNextOrderIdAsync();
    Task<string> GetNextProductIdAsync();
    Task<long> GetNextCustomerDummyIdAsync();
}
