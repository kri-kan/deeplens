using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DeepLens.Contracts.Instagram;

namespace DeepLens.Application.Abstractions.Services
{
    public interface IInstagramMediaService
    {
        /// <summary>
        /// Fully refreshes all media for a specific Instagram post.
        /// Deletes existing files/links and downloads them afresh from Graph API.
        /// </summary>
        Task<bool> RefreshPostMediaAsync(Guid dbPostId);

        /// <summary>
        /// Orchestrates the download and linking of all media for a post based on Meta Graph data.
        /// </summary>
        Task ProcessFullMediaDownloadAsync(Guid dbPostId, MetaPost post, string externalId);
    }
}
