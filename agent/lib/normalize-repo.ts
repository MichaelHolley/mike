import { getOwner } from "./get-owner.js";

/**
 * Accept a bare repo name (`mike`) or a full `owner/repo` slug and return
 * just the repo name.
 *
 * The owner is fixed by `getOwner()`. If an `owner/repo` slug is given, the
 * owner segment is only stripped when it case-insensitively matches
 * `getOwner()` (so `MICHAELHOLLEY/mike` and `michaelholley/mike` both work).
 * A slug with a genuinely different owner is a real mismatch — it throws
 * instead of silently redirecting to the locked owner's repo of that name.
 *
 * @param repo - A bare repo name, or an `owner/repo` slug for the locked owner.
 * @returns The bare repo name.
 * @throws If the input is empty, malformed, or names a different owner.
 */
export function normalizeRepo(repo: string) {
  const trimmed = repo.trim();
  const parts = trimmed.split("/");

  if (parts.length === 1) {
    const bareRepo = parts[0];
    if (!bareRepo) {
      throw new Error(`Invalid repo "${repo}": repo name cannot be empty.`);
    }
    return bareRepo;
  }

  if (parts.length > 2) {
    throw new Error(
      `Invalid repo "${repo}": expected a bare repo name or "owner/repo", ` +
        `got ${parts.length} segments.`,
    );
  }

  const [owner, repoName] = parts;
  if (!owner || !repoName) {
    throw new Error(
      `Invalid repo "${repo}": both the owner and repo name must be non-empty.`,
    );
  }

  if (owner.toLowerCase() !== getOwner().toLowerCase()) {
    throw new Error(
      `Repo "${repo}" is owned by "${owner}", not "${getOwner()}". Only ` +
        `repos owned by "${getOwner()}" can be targeted — pass the bare ` +
        `repo name (e.g. "${repoName}") if it belongs to "${getOwner()}".`,
    );
  }

  return repoName;
}
