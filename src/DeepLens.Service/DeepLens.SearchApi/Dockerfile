# Multi-stage build for DeepLens.SearchApi (.NET 9.0)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files and restore
COPY ["src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj", "src/DeepLens.Service/DeepLens.SearchApi/"]
COPY ["src/DeepLens.Service/DeepLens.Application/DeepLens.Application.csproj", "src/DeepLens.Service/DeepLens.Application/"]
COPY ["src/DeepLens.Service/DeepLens.Domain/DeepLens.Domain.csproj", "src/DeepLens.Service/DeepLens.Domain/"]
COPY ["src/DeepLens.Service/DeepLens.Infrastructure/DeepLens.Infrastructure.csproj", "src/DeepLens.Service/DeepLens.Infrastructure/"]
COPY ["src/DeepLens.Service/DeepLens.Contracts/DeepLens.Contracts.csproj", "src/DeepLens.Service/DeepLens.Contracts/"]
COPY ["src/DeepLens.Service/DeepLens.Shared.Common/DeepLens.Shared.Common.csproj", "src/DeepLens.Service/DeepLens.Shared.Common/"]
COPY ["src/DeepLens.Service/DeepLens.Shared.Telemetry/DeepLens.Shared.Telemetry.csproj", "src/DeepLens.Service/DeepLens.Shared.Telemetry/"]
COPY ["src/nuget.config", "src/"]

RUN dotnet restore "src/DeepLens.Service/DeepLens.SearchApi/DeepLens.SearchApi.csproj" --configfile src/nuget.config

# Copy full source and publish
COPY src/ src/
WORKDIR "/src/src/DeepLens.Service/DeepLens.SearchApi"
RUN dotnet publish "DeepLens.SearchApi.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "DeepLens.SearchApi.dll"]
