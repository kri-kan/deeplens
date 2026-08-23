# Multi-stage build for DeepLens.WorkerService (.NET 9.0)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj", "src/DeepLens.Service/DeepLens.WorkerService/"]
COPY ["src/DeepLens.Service/DeepLens.Application/DeepLens.Application.csproj", "src/DeepLens.Service/DeepLens.Application/"]
COPY ["src/DeepLens.Service/DeepLens.Domain/DeepLens.Domain.csproj", "src/DeepLens.Service/DeepLens.Domain/"]
COPY ["src/DeepLens.Service/DeepLens.Infrastructure/DeepLens.Infrastructure.csproj", "src/DeepLens.Service/DeepLens.Infrastructure/"]
COPY ["src/DeepLens.Service/DeepLens.Contracts/DeepLens.Contracts.csproj", "src/DeepLens.Service/DeepLens.Contracts/"]
COPY ["src/DeepLens.Service/DeepLens.Shared.Common/DeepLens.Shared.Common.csproj", "src/DeepLens.Service/DeepLens.Shared.Common/"]
COPY ["src/DeepLens.Service/DeepLens.Shared.Telemetry/DeepLens.Shared.Telemetry.csproj", "src/DeepLens.Service/DeepLens.Shared.Telemetry/"]
COPY ["src/nuget.config", "src/"]

RUN dotnet restore "src/DeepLens.Service/DeepLens.WorkerService/DeepLens.WorkerService.csproj" --configfile src/nuget.config

COPY src/ src/
WORKDIR "/src/src/DeepLens.Service/DeepLens.WorkerService"
RUN dotnet publish "DeepLens.WorkerService.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:9.0 AS runtime
WORKDIR /app
# Install ffmpeg if video processing needed
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "DeepLens.WorkerService.dll"]
