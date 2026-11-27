FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/ProjectHub.slnx backend/
COPY backend/src/ProjectHub.Domain/ProjectHub.Domain.csproj backend/src/ProjectHub.Domain/
COPY backend/src/ProjectHub.Application/ProjectHub.Application.csproj backend/src/ProjectHub.Application/
COPY backend/src/ProjectHub.Infrastructure/ProjectHub.Infrastructure.csproj backend/src/ProjectHub.Infrastructure/
COPY backend/src/ProjectHub.Api/ProjectHub.Api.csproj backend/src/ProjectHub.Api/
COPY backend/tests/ProjectHub.IntegrationTests/ProjectHub.IntegrationTests.csproj backend/tests/ProjectHub.IntegrationTests/

RUN dotnet restore backend/src/ProjectHub.Api/ProjectHub.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/src/ProjectHub.Api/ProjectHub.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser \
    && mkdir -p /app/App_Data/vault /app/App_Data/dpkeys \
    && chown -R appuser:appuser /app/App_Data

COPY --from=build /app/publish .
USER appuser

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dotnet", "ProjectHub.Api.dll"]
