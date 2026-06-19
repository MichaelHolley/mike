import { defineTool } from "eve/tools";
import { Octokit } from "octokit";
import { z } from "zod";

// Hard-locked owner. Issues can only ever be created in this user's repos.
const OWNER = "michaelholley";

export default defineTool({
  description:
    `Create a new GitHub issue in one of ${OWNER}'s repositories. ` +
    `Only repos owned by '${OWNER}' can be targeted. ` +
    "Keep issues short: write a one-sentence Summary (what + impact), " +
    "a Details section (bug: steps/expected/actual; feature: problem/proposed), " +
    "and optional Context (logs, links). Use `code` and fenced blocks. " +
    "Neutral, factual tone. Omit greetings, filler, speculation, and empty " +
    "sections. Target under ~12 lines.",
  inputSchema: z.object({
    repo: z.string().min(1).describe("Repository name, e.g. 'mike'"),
    title: z.string().min(1).describe("Issue title"),
    body: z
      .string()
      .optional()
      .describe(
        "Concise Markdown body. Structure: '## Summary' (one sentence: " +
          "what + impact), '## Details' (bug: steps, expected, actual; " +
          "feature: problem, proposed), optional '## Context' (logs/links). " +
          "Omit any section with no content — do not emit empty headings or " +
          "placeholders. Use `code` for identifiers/paths and fenced blocks " +
          "for logs. No greetings or filler. Keep it under ~12 lines.",
      ),
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
  async execute({ repo, title, body, labels, assignees }) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not set in the environment.");
    }

    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.issues.create({
      owner: OWNER,
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
