import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOwner } from "../lib/get-owner.js";
import { createOctokit } from "../lib/octokit.js";
import { normalizeRepo } from "../lib/normalize-repo.js";

export default defineTool({
  description:
    `List GitHub issues in one of ${getOwner()}'s repositories. ` +
    `Only repos owned by '${getOwner()}' can be targeted.`,
  inputSchema: z.object({
    repo: z
      .string()
      .min(1)
      .describe(
        `Repository name only, without the owner, e.g. 'mike'. The owner ` +
          `is always '${getOwner()}' — do not prefix it. If prefixed, it ` +
          `must match '${getOwner()}' or the call is rejected.`,
      ),
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Filter by issue state. Defaults to 'open'."),
    labels: z
      .array(z.string())
      .optional()
      .describe("Only issues with all of these labels"),
    assignee: z
      .string()
      .optional()
      .describe(
        "Optional. Only set to filter to a specific GitHub username's " +
          "assigned issues. Omit it to list all issues regardless of assignee.",
      ),
  }),
  outputSchema: z.object({
    issues: z.array(
      z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        url: z.string(),
        labels: z.array(z.string()),
        assignees: z.array(z.string()),
      }),
    ),
  }),
  async execute({ repo, state, labels, assignee }) {
    const octokit = createOctokit();

    // Only send filters that have a real value. Passing an empty assignee or
    // label string makes GitHub filter the results and can hide every issue.
    const trimmedAssignee = assignee?.trim();
    const activeLabels = labels?.filter((label) => label.trim().length > 0);

    const { data } = await octokit.rest.issues.listForRepo({
      owner: getOwner(),
      repo: normalizeRepo(repo),
      state: state ?? "open",
      ...(activeLabels?.length ? { labels: activeLabels.join(",") } : {}),
      ...(trimmedAssignee ? { assignee: trimmedAssignee } : {}),
    });

    return {
      issues: data
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          labels: issue.labels.map((label) =>
            typeof label === "string" ? label : (label.name ?? ""),
          ),
          assignees: (issue.assignees ?? []).map((a) => a.login),
        })),
    };
  },
  toModelOutput(output) {
    if (output.issues.length === 0) {
      return { type: "text", value: "No issues found." };
    }
    const lines = output.issues.map(
      (issue) => `#${issue.number} [${issue.state}] ${issue.title}\n${issue.url}`,
    );
    return { type: "text", value: lines.join("\n\n") };
  },
});
