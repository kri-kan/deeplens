using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using NUnit.Framework;

namespace DeepLens.ReasoningService.Tests;

[TestFixture]
public class ReasoningApiTests
{
    private HttpClient _httpClient = null!;
    private const string BaseUrl = "http://localhost:8002";
    private const string ContainerName = "deeplens-reasoning-api";

    [OneTimeSetUp]
    public async Task Setup()
    {
        Console.WriteLine("🚀 Orchestrating Reasoning Service Infrastructure...");
        await EnsureServiceIsRunning();

        _httpClient = new HttpClient { BaseAddress = new Uri(BaseUrl) };
        
        // Wait for API availability
        bool ready = false;
        for (int i = 0; i < 5; i++)
        {
            try 
            {
                var health = await _httpClient.GetFromJsonAsync<HealthResponse>("/health");
                if (health?.status == "ok")
                {
                    ready = true;
                    break;
                }
            }
            catch 
            {
                Console.WriteLine($"⏳ Waiting for API to warm up (Attempt {i+1}/5)...");
                await Task.Delay(3000);
            }
        }

        if (!ready)
        {
            Assert.Ignore("Reasoning Service failed to respond after orchestration.");
        }
    }

    private Task EnsureServiceIsRunning()
    {
        // 1. Check if container exists and its state
        var status = RunCommand("podman", $"ps -a --filter name={ContainerName} --format \"{{{{.State}}}}\"").Trim();

        if (string.IsNullOrEmpty(status))
        {
            Console.WriteLine("❌ Container does not exist. Starting via docker-compose...");
            // Run compose from infrastructure folder
            var infraDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../../../../infrastructure"));
            RunCommand("podman", "compose up -d reasoning-api", infraDir);
        }
        else if (status != "running")
        {
            Console.WriteLine($"⚠️ Container is {status}. Starting it...");
            RunCommand("podman", $"start {ContainerName}");
        }
        else
        {
            Console.WriteLine("✅ Reasoning Service container is already running.");
        }

        return Task.CompletedTask;
    }

    private string RunCommand(string command, string args, string? workingDir = null)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = command,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = workingDir ?? ""
        };

        using var process = Process.Start(startInfo);
        if (process == null) throw new Exception($"Failed to start process: {command}");
        
        string output = process.StandardOutput.ReadToEnd();
        process.WaitForExit();
        return output;
    }

    [OneTimeTearDown]
    public void TearDown()
    {
        _httpClient?.Dispose();
    }

    [Test]
    public async Task HealthEndpoint_ShouldReturnOk()
    {
        var response = await _httpClient.GetAsync("/health");
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.That(content, Is.Not.Null);
        Assert.That(content!.status, Is.EqualTo("ok"));
    }

    [Test, TestCaseSource(nameof(GetTestCases))]
    public async Task ExtractEndpoint_ShouldReturnStructuredMetadata(TestCaseData testCase)
    {
        var request = new { text = testCase.Text, category = testCase.Category };

        var response = await _httpClient.PostAsJsonAsync("/extract", request);
        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<ExtractionResponse>();
        
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.fabric, Is.EqualTo(testCase.ExpectedFabric).IgnoreCase);
        Assert.That(result.color, Does.Contain(testCase.ExpectedColor).IgnoreCase);
    }

    private static IEnumerable<TestCaseData> GetTestCases()
    {
        var json = File.ReadAllText("test-cases.json");
        var cases = JsonSerializer.Deserialize<List<TestCaseData>>(json);
        return cases ?? new List<TestCaseData>();
    }

    public class TestCaseData
    {
        public string Category { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string ExpectedFabric { get; set; } = string.Empty;
        public string ExpectedColor { get; set; } = string.Empty;
    }

    [Test]
    public async Task ExtractEndpoint_ShouldHandleBulkInputs()
    {
        var inputs = new[]
        {
            new { text = "Pure silk blue saree", category = "Saree" },
            new { text = "Red cotton kurta", category = "Kurta" }
        };

        foreach (var input in inputs)
        {
            var response = await _httpClient.PostAsJsonAsync("/extract", input);
            Assert.That(response.IsSuccessStatusCode, Is.True);
            
            var result = await response.Content.ReadFromJsonAsync<ExtractionResponse>();
            Assert.That(result!.raw_response, Is.EqualTo("MOCKED_PHI3_RESPONSE"));
        }
    }

    private class HealthResponse
    {
        public string status { get; set; } = string.Empty;
        public string model { get; set; } = string.Empty;
        public bool ready { get; set; }
    }

    private class ExtractionResponse
    {
        public string? fabric { get; set; }
        public string? color { get; set; }
        public string? stitch_type { get; set; }
        public string? work_heaviness { get; set; }
        public string[]? patterns { get; set; }
        public string[]? occasions { get; set; }
        public string[]? tags { get; set; }
        public string? raw_response { get; set; }
    }
}
