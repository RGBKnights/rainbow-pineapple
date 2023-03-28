// const OpenAIApi = require("openai");
// const changeCase = require("change-case");

// Github Events = probot => https://github.com/probot/probot
// Github Commands = context.octokit => https://octokit.github.io/rest.js/v19#usage

// async function addFile(context: Context, owner:string, repo: string, title: string, body: string) {
//   const commits = await context.octokit.repos.listCommits({
//     owner: owner,
//     repo: repo,
//   });
//   const commitSHA = commits.data[0].sha;
//   const files = [
//     {
//       name: title,
//       contents: body
//     }
//   ];
//   const commitableFiles = files.map(({ name, contents }) => {
//     return {
//       path: name,
//       mode: "100644",
//       type: "commit",
//       content: contents
//     } as const;
//   });
//   const {
//     data: { sha: currentTreeSHA },
//   } = await context.octokit.git.createTree({
//     owner: owner,
//     repo: repo,
//     tree: commitableFiles,
//     base_tree: commitSHA,
//     message: 'Added programatically with Octokit',
//     parents: [commitSHA],
//   });
//   const {
//     data: { sha: newCommitSHA },
//   } = await context.octokit.git.createCommit({
//     owner: owner,
//     repo: repo,
//     tree: currentTreeSHA,
//     message: `Commited programatically with Octokit`,
//     parents: [commitSHA],
//   });
//   await context.octokit.git.updateRef({
//     owner: owner,
//     repo: repo,
//     sha: newCommitSHA,
//     ref: "heads/" + title,
//   });
// }
// async function openAI() {
//    // const openai = new OpenAIApi({
//   //   apiKey: process.env.OPENAI_API_KEY,
//   // });
//   // const messages = [
//   //   {"role": "system", "content": "You are a helpful assistant."},
//   //   {"role": "user", "content": "Who won the world series in 2020?"},
//   //   {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
//   //   {"role": "user", "content": "Where was it played?"}
//   // ]
//   // const response = await openai.createChatCompletion({
//   //   model:"gpt-3.5-turbo",
//   //   messages: messages,
//   //   temperature: 0,
//   //   max_tokens: 100,
//   // });
//   // const content = response.data.choices[0].message.content;
// }
// async function echo(context: Context) {
//   const params = context.repo();
//     const owner = params.owner;
//     const repo = params.repo;
//     const title = context.payload.issue.title;
//     const comment = context.issue({ body: `Hello ${owner} owner of ${repo} from 🌈🍍 echoing "${title}"` });
//     await context.octokit.issues.createComment(comment);
// }
// async function isRepoInitialized(context: Context, owner: string, repo: string) {
//   try {
//     const commitList = await context.octokit.repos.listCommits({
//       owner,
//       repo,
//       per_page: 1,
//     });

//     return commitList.data.length > 0;
//   } catch (e) {
//     return false;
//   }
// }
// async function createMainBranch(context: Context, owner: string, repo: string) {
//   try {
//     const branches = await context.octokit.repos.listBranches({ owner, repo });

//     const mainBranchExists = branches.data.some((branch) => branch.name === 'main');

//     if (!mainBranchExists) {
//       const defaultBranchRef = await context.octokit.git.getRef({ owner, repo, ref: 'heads' });
//       await context.octokit.git.createRef({
//         owner,
//         repo,
//         ref: 'refs/heads/main',
//         sha: defaultBranchRef.data.object.sha,
//       });
//       console.log(`Created main branch in repo ${repo}`);
//     }
//   } catch (error) {
//     console.error(`Error creating main branch: ${error}`);
//   }
// }
// async function isRepoBlank(context: Context, owner: string, repo: string) {
//   try {
//     const allowedFiles = ['README', 'README.md', '.gitignore', 'LICENSE', 'LICENSE.md'];

//     const { data: fileList } = await context.octokit.repos.getContent({
//       owner,
//       repo,
//       path: '',
//     });

//     if (!Array.isArray(fileList)) {
//       return false;
//     }

//     const fileNames = fileList.map((file) => file.name);

//     // Check if every file in the repository is allowed
//     const isBlank = fileNames.every((fileName) => allowedFiles.includes(fileName));

//     return isBlank;
//   } catch (error) {
//     console.error(`Error checking if repo is blank: ${error}`);
//     return false;
//   }
// }
// async function createFirstFile(context: Context, owner: string, repo: string, fileName: string, fileContent: string) {
//   try {
//     await context.octokit.repos.createOrUpdateFileContents({
//       owner,
//       repo,
//       path: fileName,
//       message: 'Add initial file',
//       content: Buffer.from(fileContent).toString('base64'),
//       branch: 'main',
//     });
//     console.log(`Created file ${fileName} in repo ${repo}`);
//   } catch (error) {
//     console.error(`Error creating the first file: ${error}`);
//   }
// }


const fs = require('fs');

function readFile(path) {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch (err) {
    return "";
  }
}

async function isRepositoryInitialized(context, owner, repo) {
  try {
    const { data: commits } = await context.octokit.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });

    return commits.length > 0;
  } catch (e) {
    return false;
  }
}
async function isRepositoryBlank(context, owner, repo) {
  try {
    const initialFiles = ['README', 'README.md', '.gitignore', 'LICENSE', 'LICENSE.md'];

    const { data: fileList } = await context.octokit.repos.getContent({
      owner,
      repo,
      path: '',
    });

    const fileNames = fileList.map((file) => file.name);
    return fileNames.every((fileName) => initialFiles.includes(fileName));
  } catch (e) {
    return false;
  }
}

async function setup(context, owner, repository) {
  const isInitialized = await isRepositoryInitialized(context, owner, repository.name);
  if(!isInitialized) {
    await context.octokit.issues.create({
      owner: owner,
      repo: repository.name,
      title: `Rainbow Pineapple Instructions`,
      body: readFile("./empty.txt").replace("{OWNER}",  owner).replace("{URL}", `https://github.com/${repository.full_name}/new/main?filename=ReadMe.md&value=%23+${repository.name}`)
    });
    return;
  }
  await context.octokit.issues.create({
    owner: owner,
    repo: repository.name,
    title: `Rainbow Pineapple Instructions`,
    body: readFile("./blank.txt").replace("{OWNER}",  owner)
  });
}

async function issueForLabels(context, owner, repo) {
  const requiredLabels = [
    { name: "bug", description: "Issues or pull requests related to a bug in the code."},
    { name: "enhancement", description: "Issues or pull requests proposing new features or improvements to existing features."},
    { name: "documentation", description: "Issues or pull requests related to updating or improving documentation."},
    { name: "question", description: "Issues or pull requests seeking clarification or asking questions."}
  ];
  const results = await context.octokit.issues.listLabelsForRepo({  owner: owner, repo: repo });
  const existingLabels = results.data.map((l) => l.name);
  const labels = requiredLabels.map(l => `- [${ existingLabels.includes(l.name) ? "x" : " " }] ${l.name}: ${l.description} \n`)
  
  // Create an issue after adding the labels
  await context.octokit.issues.create(
    context.repo({
      owner: owner,
      repo: repo,
      title: "Labels",
      body: `GitHub issue labels help organize and categorize issues and pull requests within a repository. While GitHub does not have a fixed set of recommended labels, you can create custom labels that best suit your project's needs. However, here are some commonly used labels that can help you get started:
      - bug: Issues or pull requests related to a bug in the code.
      - documentation: Issues or pull requests related to updating or improving documentation.
      - duplicate: Issues or pull requests that have already been reported or submitted.
      - enhancement: Issues or pull requests proposing new features or improvements to existing features.
      - good first issue: Issues or pull requests suitable for newcomers to the project.
      - help wanted: Issues or pull requests seeking assistance or collaboration from the community.
      - invalid: Issues or pull requests that do not meet the project's criteria.
      - question: Issues or pull requests seeking clarification or asking questions.
      - wontfix: Issues or pull requests that will not be addressed or fixed, possibly due to design decisions or project scope.
      - priority: High/Medium/Low - Issues or pull requests that require attention based on their priority level.
      You can create and customize labels based on your project's specific requirements, and even use color-coding to visually categorize them. Remember, clear and descriptive labels will help your contributors better understand the project and contribute effectively.
      The repoistory has the following labels: \n` + labels.concat("\n")
    })
  );

}

async function issueForMilestones(context, owner, repo) {
  const requiredMilestones = ["1.0.0", "1.0.0.0"];
  const results = await context.octokit.issues.listMilestones({owner,repo})
  const milestones = results.data.map(m => `- [${ requiredMilestones.includes(m.title) ? "x" : " " }] ${m.title}: ${m.description} \n`)

  // Create Milestone
  await context.octokit.issues.create(
    context.repo({
      owner: owner,
      repo: repo,
      title: "Milestone Name",
      description: `GitHub milestones are a useful way to group and track progress on related issues and pull requests within a project. While there isn't a fixed set of recommended milestones, you can create custom milestones that best suit your project's needs. Here are some general ideas to help you get started:
      Version release: Create milestones for each version release (e.g., v1.0, v1.1, v2.0) to track progress towards specific releases. This can help you organize issues and pull requests that should be completed before each release.
      Project phases: If your project has distinct phases (e.g., design, development, testing), you can create milestones to track the progress of each phase. This allows you to see which tasks need to be completed before moving on to the next phase.
      Feature development: You can create milestones for specific features or modules, allowing you to track the progress of individual components of your project.
      Time-based: If your project has deadlines or specific timeframes for completion, you can create milestones based on those dates (e.g., Q1 2023, Q2 2023). This helps you ensure that your project stays on track and meets its deadlines.
      Goals or objectives: If your project has specific goals or objectives, you can create milestones to track progress towards achieving them. This can help maintain focus and ensure that the project is moving in the right direction.
      Remember that milestones should be clear, actionable, and achievable. It's important to regularly review and update your milestones to ensure they accurately reflect the current state and goals of your project.
      The repoistory has the following milestones:` + milestones.concat('\n')
  }));
  
}


async function createReadMeIssue(context, owner, repo) {
  // Create Wiki Content
  await context.octokit.issues.create(
    context.repo({
    owner: owner,
    repo: repo,
    title: `ReadMe`,
    description: `Hello ${owner}.
Rainbow Pineapple is a powerful, versatile, and efficient GitHub bot that automates various aspects of the software development process, including code production, code review, actions, and releases. The bot streamlines workflows, reduces human error, and accelerates project completion. Designed with a user-friendly interface and integration capabilities, Rainbow Pineapple is the ultimate tool to enhance your GitHub experience.

Features:

Customizable Code Templates: 🌈🍍 offers a wide range of customizable code templates for various programming languages and frameworks. Users can easily tailor these templates to their specific needs and requirements, ensuring a smooth and personalized coding experience.
Collaborative Editing: 🌈🍍 enables multiple team members to collaborate on the same codebase simultaneously, fostering effective communication and faster decision-making. The bot also maintains a real-time synchronization of changes, reducing conflicts and promoting a unified development environment.
Automated Testing: 🌈🍍 supports automated testing for various test suites, including unit, integration, and system tests. The bot continually monitors the codebase, identifying potential issues and notifying developers of any discrepancies or bugs.
Security Analysis: 🌈🍍 conducts a comprehensive security analysis of the codebase, identifying vulnerabilities, and suggesting remediation strategies. This feature ensures that the final product adheres to the highest security standards, minimizing the risk of potential threats.
Documentation Assistance: 🌈🍍 assists in generating and maintaining up-to-date project documentation, including user guides, API documentation, and inline code comments. This ensures that both developers and end-users have access to clear and concise information about the project.

How to use 🌈🍍 GitHub Bot:
1. Issue Management: Create and manage issues with ease using the bot's intuitive interface. Label issues with appropriate tags, such as [enhancement] or [bug] or [question], and let the AI handle the rest, from requirements gathering to generating code changes.
2. Collaboration: Leverage the bot's collaborative editing feature to work seamlessly with your team members on the same codebase. Share feedback, review changes, and merge pull requests efficiently.
3. Continuous Integration and Deployment: Integrate 🌈🍍 with the actions pipeline that includes building, testing, and deploying your project.
4. Analytics: Ask questions about the repository, create summaries of files, and get sugjestions about improving your repository, documents, or process.

For in-depth information and advanced usage, consult the Rainbow Pineapple GitHub repository and the extensive documentation provided. Allow Rainbow Pineapple to become your trusted partner in software development, empowering your team to create high-quality, secure, and efficient applications with ease.`
  }));
}

async function issueForRootFiles(context, owner, repo) {
  // 
  const requiredTemplates = [
    { name: "README.md", description: "A markdown file that provides an overview of the project, its purpose, and instructions for setup, usage, and contribution. It is often the first file users see when they visit the repository." },
    { name: "LICENSE", description: "A file that specifies the license under which the project is distributed, such as MIT, GPL, or Apache. This file helps define the terms and conditions under which the code can be used, modified, and distributed" },
    { name: "CONTRIBUTING.md", description: "A file that provides guidelines and instructions for contributors who want to submit issues, pull requests, or otherwise contribute to the project." },
    { name: "CHANGELOG.md", description: "A file that documents the changes made to the project over time, such as new features, bug fixes, or breaking changes. It helps users understand what has changed between different versions of the project." },
    { name: "CODE_OF_CONDUCT.md", description: "A file that establishes the code of conduct for project contributors and participants, promoting a positive and inclusive community environment." },
    { name: "SECURITY.md", description: "A file that provides guidelines and instructions for reporting security vulnerabilities in the project. It helps ensure that security issues are responsibly disclosed and properly addressed." }
  ];
  const { data: fileList } = await context.octokit.repos.getContent({
    owner,
    repo,
    path: '',
  });  
  if (!Array.isArray(fileList)) {
    return false;
  }
  const fileNames = fileList.map((file) => file.name);
  const files = requiredTemplates.map(f => `- [${ fileNames.includes(f.name) ? "x" : " " }] ${f.name}: ${f.description} \n`)
  
  await context.octokit.issues.create(
    context.repo({
    owner: owner,
    repo: repo,
    title: "Common Files",
    description: `These files are common to most repoistories:` + files.concat('\n')
  }));
}

async function issueForTemplateFiles(context, owner, repo) {
    const requiredTemplates = [
      { name: "ISSUE_TEMPLATE", description: "A directory containing issue templates for your repository. When users create new issues, they can choose from these templates, which can help standardize and streamline issue reporting." },
      { name: "PULL_REQUEST_TEMPLATE", description: "A file or directory containing pull request templates for your repository. These templates help guide contributors when they submit pull requests, ensuring they provide necessary information and adhere to the project's guidelines." },
      { name: "CODEOWNERS", description: "A file used to define code owners for specific files or directories in the repository. Code owners are automatically requested for review when someone submits a pull request that modifies the code they own." },
      { name: "FUNDING.yml", description: "A file used to display a 'Sponsor' button on your repository, providing information on how users can financially support the project. This file can include links to various funding platforms like Patreon, Open Collective, or GitHub Sponsors." },
      { name: "CONTRIBUTING.md", description: "Although not exclusive to the .github directory, the CONTRIBUTING.md file can be placed here. It provides guidelines and instructions for contributors who want to submit issues, pull requests, or otherwise contribute to the project." },
    ];

    const { data: fileList } = await context.octokit.repos.getContent({
      owner,
      repo,
      path: '/.github/',
    });

    if (!Array.isArray(fileList)) {
      return false;
    }

    const fileNames = fileList.map((file) => file.name);
    const templates = requiredTemplates.map(f => `- [${ fileNames.includes(f.name) ? "x" : " " }] ${f.name}: ${f.description} \n`)
  
    // Create Template
    await context.octokit.issues.create(
      context.repo({
      owner: owner,
      repo: repo,
      title: "Template Files",
      description: `This directory stores various configuration files and templates used by different GitHub features. 
These features help maintain consistency and streamline collaboration among team members.` + templates.concat('\n')
    }));
}

module.exports = function server(app) {
  
  app.on("installation_repositories", async (context) => {
    console.log('installation_repositories', context.payload);

    // const repos = context.payload.repositories_added;
    // for (const repo of repos) {
    //   issueForLabels(context,  repo.owner.login, repo.name);
    //   issueForMilestones(context, repo.owner.login, repo.name);
    //   issueForRootFiles(context, repo.owner.login, repo.name);
    //   issueForTemplateFiles(context, repo.owner.login, repo.name);
    // }
  });

  /*
  [o] issue_comment.created: Triggered when a comment is created on an issue.
  [o] issue_comment.edited: Triggered when a comment is deleted on an issue.
  [o] issues.labeled: Triggered when a label is added or removed from an issue.
  [o] issues.assigned: Triggered when an issue is assigned or unassigned to a user or team.
  [o] issues.milestoned: Triggered when an issue is added from a milestone.
  [o] issues.edited: Triggered when an issue is edited.
  [o] issues.opened: Triggered when an issue is opened.
  */
  app.on("issues.opened", async (context) => {
    const issue = context.payload.issue
    const isCreatedByBot = issue.user.type === 'Bot'
    if (isCreatedByBot) {
      return;
    }

    // const issue = context.payload.issue;
    // const repo = context.payload.repository;

    // const isInitialized = await isRepoInitialized(context, repo.owner.login, repo.name);
    // const isEmpty = await isRepoBlank(context, repo.owner.login, repo.name);
    // const comment = context.issue({ body: `isInitialized: ${isInitialized}, isEmpty: ${isEmpty}` });
    // await context.octokit.issues.createComment(comment);

    // try {
    //   // Get Reference branch
    //   const baseRef = await context.octokit.git.getRef({
    //     owner: repo.owner.login,
    //     repo: repo.name,
    //     ref: `heads/${repo.default_branch}`,
    //   });
  
    //   // Create a new branch
    //   await context.octokit.git.createRef({
    //     owner: repo.owner.login,
    //     repo: repo.name,
    //     ref: `refs/heads/${branchName}`,
    //     sha: baseRef.data.object.sha,
    //   });
  
    //   // Create a new file and commit
    //   const fileContent = Buffer.from(issue.body || '').toString('base64');
  
    //   await context.octokit.repos.createOrUpdateFileContents({
    //     owner: repo.owner.login,
    //     repo: repo.name,
    //     path: `${fileName}.txt`,
    //     message: `Create ${fileName}.txt for issue ${issue.number}`,
    //     content: fileContent,
    //     branch: branchName,
    //   });

    //   await echo(context);
  
    //   console.log(`New commit created on branch "${branchName}" with new_file.txt`);
    // } catch (error) {
    //   console.error(`Error creating commit on branch "${branchName}":`, error);
    // }
  });


}