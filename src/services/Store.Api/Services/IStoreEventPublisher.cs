namespace Store.Api.Services;

public interface IStoreEventPublisher
{
    Task PublishAsync(string topic, string key, object payload, CancellationToken ct = default);
}
