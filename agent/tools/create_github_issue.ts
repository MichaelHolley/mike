import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOwner } from "../lib/get-owner.js";
import { createOctokit } from "../lib/octokit.js";
import { normalizeRepo } from "../lib/normalize-repo.js";

export default defineTool({
  description:
    `Create a new GitHub issue in one of ${getOwner()}'s repositories. ` +
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
          "for logs. No greetings or filler. Keep it to 24 lines or fewer.",
      ),
  }),
  outputSchema: z.object({
    number: z.number(),
    url: z.string(),
    title: z.string(),
  }),
  async execute({ repo, title, body }) {
    const octokit = createOctokit();

    const { data } = await octokit.rest.issues.create({
      owner: getOwner(),
      repo: normalizeRepo(repo),
      title,
      body,
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
