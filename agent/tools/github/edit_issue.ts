import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOwner } from "../../lib/github/owner.js";
import { isNotFound } from "../../lib/github/errors.js";
import { createOctokit } from "../../lib/github/octokit.js";
import { normalizeRepo } from "../../lib/github/normalize-repo.js";

export default defineTool({
  description:
    `Edit an existing GitHub issue's title and/or Markdown body in one of ` +
    `${getOwner()}'s repositories. Fields left unset keep their current ` +
    `value; a body you pass replaces the existing one entirely, so read the ` +
    `issue first if you mean to amend it. Only repos owned by ` +
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
      .describe("Issue number, e.g. 17 for issue #17."),
    title: z
      .string()
      .min(1)
      .optional()
      .describe("New issue title. Omit to keep the current title."),
    body: z
      .string()
      .optional()
      .describe(
        "New Markdown body, replacing the current one in full. Omit to keep " +
          "the current body; pass an empty string only to deliberately " +
          "clear it. Structure: '## Summary' (one sentence: what + " +
          "impact), '## Details' (bug: steps, expected, actual; feature: " +
          "problem, proposed), optional '## Context' (logs/links). Omit any " +
          "section with no content — do not emit empty headings or " +
          "placeholders. Use `code` for identifiers/paths and fenced blocks " +
          "for logs. No greetings or filler. Keep it to 24 lines or fewer.",
      ),
  }),
  outputSchema: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string(),
    state: z.string(),
    url: z.string(),
    updatedAt: z.string(),
  }),
  async execute({ repo, number, title, body }) {
    if (title === undefined && body === undefined) {
      throw new Error(
        `Nothing to edit on issue #${number}: pass a title, a body, or both.`,
      );
    }

    const octokit = createOctokit();
    const owner = getOwner();
    const repoName = normalizeRepo(repo);

    let issue;
    try {
      ({ data: issue } = await octokit.rest.issues.get({
        owner,
        repo: repoName,
        issue_number: number,
      }));
    } catch (error) {
      if (!isNotFound(error)) throw error;

      throw new Error(
        `Cannot edit issue #${number} in "${owner}/${repoName}": the issue ` +
          `or the repository does not exist, or the token cannot access it.`,
        { cause: error },
      );
    }

    if (issue.pull_request) {
      throw new Error(
        `#${number} in "${owner}/${repoName}" is a pull request, not an issue.`,
      );
    }

    // The read above already proved the issue exists and is readable, so a
    // failure here is a write-side problem (archived repo, locked issue,
    // read-only token) — surface GitHub's own reason with the target named.
    let data;
    try {
      ({ data } = await octokit.rest.issues.update({
        owner,
        repo: repoName,
        issue_number: number,
        ...(title === undefined ? {} : { title }),
        ...(body === undefined ? {} : { body }),
      }));
    } catch (error) {
      throw new Error(
        `Cannot edit issue #${number} in "${owner}/${repoName}": ` +
          `${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    return {
      number: data.number,
      title: data.title,
      body: data.body ?? "",
      state: data.state,
      url: data.html_url,
      updatedAt: data.updated_at,
    };
  },
  toModelOutput(output) {
    return {
      type: "text",
      value:
        `Updated issue #${output.number}: ${output.title}\n${output.url}\n` +
        `State: ${output.state}\nUpdated: ${output.updatedAt}\n\n` +
        `${output.body || "(no body)"}`,
    };
  },
});
