
const { Configuration, OpenAIApi } = require("openai");
const changeCase = require('change-case');
const fs = require('fs');

function readData(path) {
  return fs.readFileSync(path, 'utf8');
}

function writeData(repoOwner, repoName, event, id, obj) {
  fs.writeFileSync(`./events/${event}-${changeCase.paramCase(repoOwner)}-${changeCase.paramCase(repoName)}-${id}.json`, JSON.stringify(obj), 'utf8');
}

async function addBranchesToState(context, state, exBranches) {
  try {
    const repository = context.payload.repository;
    const { data: branches }  = await context.octokit.repos.listBranches({
      owner: repository.owner.login,
      repo: repository.name,
    });
    state.branches = branches.filter(b => exBranches.includes(b.name) == false).map(b => ({name: b.name, protected: b.protected }));
  } catch (error) {
    console.log('addBranchesToState', error);
  }
}

async function addLabelsToState(context, state, exLabels = []) {
  try {
    const repository = context.payload.repository;
    const { data: labels } = await context.octokit.issues.listLabelsForRepo({
      owner: repository.owner.login,
      repo: repository.name,
    });
    state.labels = labels.filter(l => exLabels.includes(l.id) == false).map(l => ({name: l.name, description: l.description}));
  } catch (error) {
    console.log('addLabelsToState', error);
  }
}

async function addMilestonesToState(context, state, exMilestones) {
  try {
    const repository = context.payload.repository;
    const { data: milestones } = await context.octokit.issues.listMilestones({
      owner: repository.owner.login,
      repo: repository.name,
    });

    state.milestones = milestones.filter(m =>  m.state === 'open').filter(m => exMilestones.includes(m.id) == false);
  } catch (error) {
    console.log('addMilestonesToState', error);
  }
}

async function addOpenIssuesToState(context, state, exIssues) {
  try {
    const repository = context.payload.repository;
    const { data: issues } = await context.octokit.issues.listForRepo({
      owner: repository.owner.login,
      repo: repository.name,
      // state: "open", // is this need?
    });

    // labels, milestone, ..?
    state.issues = issues.filter(i => exIssues.includes(i.id) == false).map(i => ({number: i.number, author: i.user.login, title: i.title, body: i.body })); 

  } catch (error) {
    console.log('addOpenIssuesToState', error);
  }
}

async function addExistingFilesToState(context, state, exFiles) {
  try {
    const repository = context.payload.repository;

    const { data: ref } = await context.octokit.git.getRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: 'heads/main',
    });

    const { data: { tree: tree } } = await context.octokit.git.getTree(
      {
        owner: repository.owner.login,
        repo: repository.name,
        tree_sha: ref.object.sha,
        recursive: true,
      }
    );

    const files = tree.filter(item => item.type === 'blob');

    for (const file of files) {
      if(exFiles.includes(file.sha)) continue;

      const { data: { encoding: encoding, path: path, content: content }} = await context.octokit.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: file.path,
      });

      switch (encoding) {
        case "ascii":
          state.files.push({ path: path, content: Buffer.from(content, 'ascii').toString("utf-8") });
          break;
        case "base64":
          state.files.push({ path: path, content: Buffer.from(content, 'base64').toString("utf-8") });
          break;
        case "utf-8":
          state.files.push({ path: path, content: content });
          break;
        case "binary":
        case "none":
        default:
          state.files.push({ path: path, content: "" });
          break;
      }
    }
  } catch (error) {
    console.log('addExistingFilesToState', error);
  }
}

async function getState(context, excludes = {}) {
  const repository = context.payload.repository;

  const defaultExcludes = {
    branches: [],
    labels: [],
    milestones: [],
    issues: [],
    files: [],
  };
  const ex = { 
    ...defaultExcludes,
    ...excludes, 
  }

  let state = {
    repository: repository,
    branches: [],
    labels: [],
    milestones: [],
    issues: [],
    files: [],
  };

  await addLabelsToState(context, state, ex.labels);
  await addBranchesToState(context, state, ex.branches);
  await addMilestonesToState(context, state, ex.milestones);
  await addOpenIssuesToState(context, state, ex.issues);
  await addExistingFilesToState(context, state, ex.files);
  return state;
}

module.exports = function server(app) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);
  const chatModel = "gpt-4";

  app.on("installation.created", async (context) => {
    // Should we do anything automaticly here..?
  });

  app.on("issues.opened", async (context) => {
    try {
      // console.log("issues.opened", context.payload);

      if(context.isBot) return;

      // the current issue...
      const issue = context.payload.issue;

      // get state of Repository to provide context to the AI.
      let state = await getState(context, excludes);

      // Ask AI for an understanding of issue based on the project's context.
      {
        const messages = [{"role": "system", "content": "You are a helpful assistant."}];
        messages.push({"role": "user", "content": readData("./prompts/bot_modes.txt")});
        messages.push({"role": "assistant", "content": "OK"});

        const repoName = state.repository.name;
        const repoOwner = state.repository.owner.login;

        // const commands = readData("./prompts/commands.txt").split("\n");
        // for (const cmd of commands) {
        //   messages.push({"role": "user", "content": `[command] ${cmd}` });
        //   messages.push({"role": "assistant", "content": "OK"});
        // }
        
        messages.push({"role": "user", "content": `[repository] ${repoOwner}\\${repoName}` });
        messages.push({"role": "assistant", "content": "OK"});

        if(state.repository.description) {
          messages.push({"role": "user", "content": `[description] ${state.repository.description}` });
          messages.push({"role": "assistant", "content": "OK"});
        }

        if(state.repository.default_branch) {
          messages.push({"role": "user", "content": `[default branch] ${state.repository.default_branch}` });
          messages.push({"role": "assistant", "content": "OK"});
        }

        if(state.repository.language) {
          messages.push({"role": "user", "content": `[language] ${state.repository.language}` });
          messages.push({"role": "assistant", "content": "OK"});
        }

        for (const branch of state.branches) {
          messages.push({"role": "user", "content": `[branch] '${branch.name}'` });
          messages.push({"role": "assistant", "content": "OK"});
        }
        
        for (const label of state.labels) {
          messages.push({"role": "user", "content": `[label] '${label.name}': ${label.description}` });
          messages.push({"role": "assistant", "content": "OK"});
        }
        
        for (const milestone of state.milestones) {
          messages.push({"role": "user", "content": `[milestone] '${milestone.title}'` });
          messages.push({"role": "assistant", "content": "OK"});
        }
      
        for (const i of state.issues) {
          messages.push({"role": "user", "content": `[issue] ${i.title} #${i.number} submitted by @${i.author}: ${i.body}`});
          messages.push({"role": "assistant", "content": "OK"});
        }

        for (const file of state.files) {
          messages.push({"role": "user", "content": `[file] ${file.path}: ${file.content}`});
          messages.push({"role": "assistant", "content": "OK"});
        }

        messages.push({"role": "user", "content": "Are you ready?"});
        messages.push({"role": "assistant", "content": "READY"});
        messages.push({"role": "user", "content": readData("./prompts/analysis_issue2.txt") + ` [issue] ${issue.title} #${issue.number} submitted by @${issue.user.login}: ${issue.body}`});
        
        writeData(repoOwner, repoName, "issue-input", issue.number, messages);
        
        const response = await openai.createChatCompletion({
          model: chatModel,
          messages: messages,
          temperature: 0.1,
          max_tokens: 2000,
        });

        writeData(repoOwner, repoName, "issue-output", issue.number, response.data);

        const choices = response.data.choices.filter(c => c.finish_reason == "stop")
        for (const choice of choices) {
          await context.octokit.issues.createComment(
            {
              owner: repoOwner,
              repo: repoName,
              issue_number : issue.number,
              body: choice.message.content,
            }
          );
        }
      }

    } catch (error) {
      console.log('issues.opened', error);
    }
  });

  app.on("issue_comment.created", async (context) => {
    //console.log('issue_comment.created', context.payload);
    
    // if(context.isBot) return;

    // const comment = context.payload.comment;
    
    // {
    //   // Skip is the context.payload.sender is not a Collaborator - No Authority to run Commands.
    //   const { data: authority } = await context.octokit.repos.getCollaboratorPermissionLevel({
    //     owner: repoOwner,
    //     repo: repoName,
    //     username: context.payload.sender.login,
    //   });

    //   switch (authority?.permission) {
    //     case 'admin':
    //     case 'write':
    //       {
    //         const prompt = readData("./prompts/isssue_comment_command.txt") + comment;
    //         const messages = [
    //           {"role": "system", "content": "You are a helpful assistant."},
    //           {"role": "user", "content": prompt }
    //         ];

    //         writeData(repoOwner, repoName, "issue_comment-input", issue.number, messages);

    //         const response = await openai.createChatCompletion({
    //           model: openaimModel,
    //           messages: messages,
    //           temperature: 0.1,
    //           max_tokens: 1000,
    //         });
    //         writeData(repoOwner, repoName, "issue_comment-output", issue.number, response.data);

    //         const choices = response.data.choices.filter(c => c.finish_reason == "stop")
    //         for (const choice of choices) {
    //           await context.octokit.issues.createComment(
    //             {
    //               owner: repoOwner,
    //               repo: repoName,
    //               issue_number : issue.number,
    //               body: choice.message.content,
    //             }
    //           );
    //         }
    //       }
    //       break;
    //     default:
    //       break;
    //   }
    // }

    // TODO:
    // (Chat) Ask AI for reponse to the comment in the context of this issue. (last word protocol).

  });

  app.on("pull_request.opened", async (context) => {
    //console.log('pull_request.opened', context.payload);
  });

  app.on("pull_request_review_comment.created", async (context) => {
    //console.log('pull_request_review_comment.created', context.payload);
  });
}
