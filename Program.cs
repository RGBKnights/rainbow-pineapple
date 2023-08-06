using RainbowPineapple;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Octokit.Webhooks;
using Octokit.Webhooks.AzureFunctions;
using Octokit;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel.CoreSkills;
using Microsoft.SemanticKernel.Connectors.Memory.Qdrant;

var host = new HostBuilder()
    .ConfigureServices(collection =>
    {
        collection.AddHttpClient();
        collection.AddSingleton<KernelConfig>((sp) => {
            var key = Environment.GetEnvironmentVariable("OPENAI_KEY") ?? throw new ArgumentNullException("OPENAI_KEY");
            var org = Environment.GetEnvironmentVariable("OPENAI_ORG") ?? throw new ArgumentNullException("OPENAI_ORG");
            var factory = sp.GetRequiredService<IHttpClientFactory>();
            var client = factory.CreateClient();
            return new KernelConfig()
                .AddOpenAIChatCompletionService("gpt-4", key, org, false, httpClient: client)
                .AddOpenAITextCompletionService("text-davinci-003", key, org, httpClient: client)
                .AddOpenAITextEmbeddingGenerationService("text-embedding-ada-002", key, org, httpClient: client);
        });
        collection.AddSingleton<IMemoryStore>(new VolatileMemoryStore()); // new QdrantMemoryStore("http://localhost", 6333, 1536)
        collection.AddSingleton<IKernel>(sp => {
            var logger = sp.GetService<ILogger<Program>>() ?? throw new ArgumentNullException("ILogger");
            var memory = sp.GetService<IMemoryStore>() ?? throw new ArgumentNullException("IMemoryStore");
            var config = sp.GetService<KernelConfig>() ?? throw new ArgumentNullException("KernelConfig");
            
            IKernel myKernel = Kernel.Builder
                .WithConfiguration(config)
                .WithLogger(logger)
                .WithMemoryStorage(memory)
                .Build();

            myKernel.ImportSkill(new TextMemorySkill(), nameof(TextMemorySkill));
            myKernel.ImportSemanticSkillFromDirectory("semantics", "GithubSkill");
            // myKernel.ImportSkill(new MathSkill(), nameof(MathSkill));
            // myKernel.ImportSkill(new TextSkill(), nameof(TextSkill));
            // myKernel.ImportSkill(new TimeSkill(), nameof(TimeSkill));
            // myKernel.ImportSkill(new WaitSkill(), nameof(WaitSkill));

            return myKernel;
        });
        collection.AddSingleton<GitHubClient>(sp => {
            return new GitHubClient(new Octokit.ProductHeaderValue("rainbow-pineapple"));
        });
        collection.AddSingleton<WebhookEventProcessor, MyWebhookEventProcessor>();
    })
    .ConfigureGitHubWebhooks(secret: Environment.GetEnvironmentVariable("WEBHOOK_SECRET"))
    .ConfigureFunctionsWorkerDefaults()
    .Build();

host.Run();


