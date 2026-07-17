export const MEMORY_PREFIX = "memory/";

const SLUG_SEGMENT = "[a-zA-Z0-9_-]+";
const SLUG_REGEX = new RegExp(`^${SLUG_SEGMENT}(?:/${SLUG_SEGMENT})*$`);

/**
 * Turn an agent-supplied memory name into its blob-bunny path.
 *
 * The agent passes a bare slug (e.g. `user-preferences`); this owns the
 * `memory/` prefix and `.md` extension so the agent can never produce a path
 * blob-bunny rejects. A stray prefix or extension is stripped first, so
 * `memory/user-preferences.md` and `user-preferences` both resolve the same.
 *
 * @throws If the slug contains anything outside letters, numbers, dashes,
 *   underscores, and `/` segment separators.
 */
export function toMemoryPath(name: string): string {
  const slug = name
    .trim()
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${MEMORY_PREFIX}`), "")
    .replace(/\.md$/i, "");

  if (!SLUG_REGEX.test(slug)) {
    throw new Error(
      `Invalid memory name "${name}": use letters, numbers, dashes, ` +
        `underscores, and "/" to nest — no dots, spaces, or leading "/".`,
    );
  }

  return `${MEMORY_PREFIX}${slug}.md`;
}
