export const MEMORY_PREFIX = "memory/";

const SLUG_SEGMENT = "[a-zA-Z0-9_-]+";
const SLUG_REGEX = new RegExp(`^${SLUG_SEGMENT}(?:/${SLUG_SEGMENT})*$`);

/**
 * Canonicalize an agent-supplied memory name to its bare slug.
 *
 * The agent passes a bare slug (e.g. `user-preferences`), but a stray
 * `memory/` prefix or `.md` extension is stripped first, so
 * `memory/user-preferences.md` and `user-preferences` resolve to the same
 * slug. Callers must key both the blob and the index entry off this one value
 * so they never desync.
 *
 * @throws If the slug contains anything outside letters, numbers, dashes,
 *   underscores, and `/` segment separators.
 */
export function canonicalMemoryName(name: string): string {
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

  return slug;
}

/** Blob-bunny path for a memory. The agent never sees this. */
export function toMemoryPath(name: string): string {
  return `${MEMORY_PREFIX}${canonicalMemoryName(name)}.md`;
}
