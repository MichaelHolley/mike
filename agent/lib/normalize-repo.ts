/**
 * Accept a bare repo name (`mike`) or a full `owner/repo` slug and return just
 * the repo name. The owner is fixed by `getOwner()`, so any prefix is dropped.
 * GitHub repo names cannot contain `/`, so the final segment is always the repo.
 *
 * @param repo - A repo name or `owner/repo` slug.
 * @returns The bare repo name.
 */
export function normalizeRepo(repo: string) {
  return repo.trim().split("/").pop() ?? "";
}
