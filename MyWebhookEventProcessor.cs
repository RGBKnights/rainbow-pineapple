namespace RainbowPineapple;

using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Octokit;
using Octokit.Webhooks;
using Octokit.Webhooks.Events;
using Octokit.Webhooks.Events.InstallationRepositories;
using Octokit.Webhooks.Events.IssueComment;
using Octokit.Webhooks.Events.Issues;
using Octokit.Webhooks.Events.PullRequest;

public class MyWebhookEventProcessor : WebhookEventProcessor
{
    private readonly ILogger<MyWebhookEventProcessor> logger;
    private readonly GitHubClient client;
    private readonly IKernel kernel;

    public MyWebhookEventProcessor(ILogger<MyWebhookEventProcessor> logger, GitHubClient client, IKernel kernel)
    {
        this.logger = logger;
        this.client = client;
        this.kernel = kernel;
    }

    protected override async Task ProcessPullRequestWebhookAsync(WebhookHeaders headers, PullRequestEvent pullRequestEvent, PullRequestAction action)
    {
      switch (action)
      {
          case PullRequestActionValue.Opened:
              this.logger.LogInformation("pull request opened");
              await Task.Delay(1000);
              break;
          default:
              this.logger.LogInformation("Some other pull request event");
              await Task.Delay(1000);
              break;
      }
    }

  protected override async Task ProcessIssuesWebhookAsync(WebhookHeaders headers, IssuesEvent issuesEvent, IssuesAction action)
  {
    var ctx = this.kernel.CreateNewContext();

    switch (action)
    {
      case IssuesActionValue.Opened:
        this.logger.LogInformation("issue opened");
        var id = issuesEvent?.Repository?.Id ?? throw new InvalidOperationException("Invalid Repository");
        var num = (int)issuesEvent.Issue.Number;
        var issue = await client.Issue.Get(id, num);
        var comments = await client.Issue.Comment.GetAllForIssue(id, num);
        this.logger.LogInformation("opened issue: " + issue.Id);
        break;
      default:
        this.logger.LogInformation("Some other issue event");
        break;
    }
  }

  protected override async Task ProcessIssueCommentWebhookAsync(WebhookHeaders headers, IssueCommentEvent issueCommentEvent, IssueCommentAction action)
  {
    switch (action)
    {
      case IssueCommentActionValue.Created:
        this.logger.LogInformation("issue opened");
        await Task.Delay(1000);
        break;
      default:
        this.logger.LogInformation("Some other issue event");
        break;
    }
  }

  protected override async Task ProcessInstallationRepositoriesWebhookAsync(WebhookHeaders headers, InstallationRepositoriesEvent installationRepositoriesEvent, InstallationRepositoriesAction action)
  {
    switch (action)
    {
      case InstallationRepositoriesActionValue.Added:
        this.logger.LogInformation("app installed");
        // TODO: Index Repository Create Memories
        await Task.Delay(1000);
        break;
      case InstallationRepositoriesActionValue.Removed:
        this.logger.LogInformation("app removed");
        // TODO: Delete Memories
        await Task.Delay(1000);
        break;
      default:
        this.logger.LogInformation("Some other issue event");
        break;
    }
  }

}