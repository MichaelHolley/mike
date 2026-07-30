import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOwner } from "../../lib/github/owner.js";
import { isNotFound } from "../../lib/github/errors.js";
import { createOctokit } from "../../lib/github/octokit.js";
import { normalizeRepo } from "../../lib/github/normalize-repo.js";

export default defineTool({
  description:
    `Read a single GitHub issue by number from one of ${getOwner()}'s ` +
    `repositories, including its full Markdown body. Only repos owned by ` +
    `'${getOwner()}' can be targeted.`,
  inputSchema: z.object({
    repo: z
      .string()
      .min(1)
      .describe(
        `Repository name only, without the owner, e.g. 'mike'. The owner ` +
          `is always '${getOwner()}' — do not prefix it. If prefixed, it ` +
          `must match '${getOwner()}' or the call is rejected.`,
      ),
    number: z
      .number()
      .int()
      .positive()
      .describe("Issue number, e.g. 18 for issue #18."),
  }),
  outputSchema: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string(),
    state: z.string(),
    labels: z.array(z.string()),
    assignees: z.array(z.string()),
    author: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    closedAt: z.string().nullable(),
    url: z.string(),
    commentsUrl: z.string(),
    comments: z.number(),
  }),
  async execute({ repo, number }) {
    const octokit = createOctokit();
    const owner = getOwner();
    const repoName = normalizeRepo(repo);

    let data;
    try {
      ({ data } = await octokit.rest.issues.get({
        owner,
        repo: repoName,
        issue_number: number,
      }));
    } catch (error) {
      if (!isNotFound(error)) throw error;

      throw new Error(
        `Cannot read issue #${number} in "${owner}/${repoName}": the issue ` +
          `or the repository does not exist, or the token cannot access it.`,
        { cause: error },
      );
    }

    if (data.pull_request) {
      throw new Error(
        `#${number} in "${owner}/${repoName}" is a pull request, not an issue.`,
      );
    }

    return {
      number: data.number,
      title: data.title,
      body: data.body ?? "",
      state: data.state,
      labels: data.labels.map((label) =>
        typeof label === "string" ? label : (label.name ?? ""),
      ),
      assignees: (data.assignees ?? []).map((a) => a.login),
      author: data.user?.login ?? "",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      url: data.html_url,
      commentsUrl: data.comments_url,
      comments: data.comments,
    };
  },
  toModelOutput(output) {
    const meta = [
      `State: ${output.state}`,
      `Author: @${output.author}`,
      output.labels.length ? `Labels: ${output.labels.join(", ")}` : null,
      output.assignees.length
        ? `Assignees: ${output.assignees.map((a) => `@${a}`).join(", ")}`
        : null,
      `Created: ${output.createdAt}`,
      `Updated: ${output.updatedAt}`,
      output.closedAt ? `Closed: ${output.closedAt}` : null,
      `Comments: ${output.comments}`,
    ].filter((line) => line !== null);

    return {
      type: "text",
      value:
        `#${output.number} ${output.title}\n${output.url}\n` +
        `${meta.join("\n")}\n\n${output.body || "(no body)"}`,
    };
  },
});
