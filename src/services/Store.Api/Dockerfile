# =============================================================================
# DeepLens Store.Api: Production Self-Contained Container Image
# Multi-stage build with minimal runtime footprint
# =============================================================================

# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Store.Api.csproj ./
RUN dotnet restore Store.Api.csproj

COPY . ./
RUN dotnet publish Store.Api.csproj -c Release -o /app/publish

# Stage 2: Production Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:5200 \
    DOTNET_RUNNING_IN_CONTAINER=true

COPY --from=build /app/publish .

EXPOSE 5200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5200/health || exit 1

ENTRYPOINT ["dotnet", "Store.Api.dll"]
