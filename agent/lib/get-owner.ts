// Hard-locked owner. Tools may only ever target this user's repos.
const OWNER = "MichaelHolley";

/**
 * The hard-locked GitHub owner that all tools target.
 *
 * @returns The owner's GitHub username.
 */
export function getOwner() {
  return OWNER;
}
