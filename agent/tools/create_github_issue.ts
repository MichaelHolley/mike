import { defineTool } from "eve/tools";
import { Octokit } from "octokit";
import { z } from "zod";

const DEFAULT_OWNER = "michaelholley";

export default defineTool({
  description:
    "Create a new GitHub issue in one of the user's repositories. " +
    "Owner defaults to the user 'michaelholley' when not given.",
  inputSchema: z.object({
    repo: z.string().min(1).describe("Repository name, e.g. 'mike'"),
    title: z.string().min(1).describe("Issue title"),
    body: z.string().optional().describe("Issue body in Markdown"),
    owner: z
      .string()
      .optional()
      .describe(`Repo owner. Defaults to '${DEFAULT_OWNER}'.`),
    labels: z.array(z.string()).optional().describe("Labels to apply"),
    assignees: z
      .array(z.string())
      .optional()
      .describe("GitHub usernames to assign"),
  }),
  outputSchema: z.object({
    number: z.number(),
    url: z.string(),
    title: z.string(),
  }),
  async execute({ repo, title, body, owner, labels, assignees }) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not set in the environment.");
    }

    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.issues.create({
      owner: owner ?? DEFAULT_OWNER,
      repo,
      title,
      body,
      labels,
      assignees,
    });

    return {
      number: data.number,
      url: data.html_url,
      title: data.title,
    };
  },
  toModelOutput(output) {
    return {
      type: "text",
      value: `Created issue #${output.number}: ${output.title}\n${output.url}`,
    };
  },
});
