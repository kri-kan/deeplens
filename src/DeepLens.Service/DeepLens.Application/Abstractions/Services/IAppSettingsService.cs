using System.Collections.Generic;
using System.Threading.Tasks;
using DeepLens.Domain.Entities;

namespace DeepLens.Application.Abstractions.Services
{
    public interface IAppSettingsService
    {
        Task<List<AppSetting>> GetAllAsync();
        Task<List<AppSetting>> GetSectionAsync(string section);
        Task<List<AppSetting>> GetSectionInternalAsync(string section);
        Task<AppSetting?> UpsertAsync(string key, string? value);
        Task SeedDefaultsAsync();
    }
}
