import { Octokit } from "octokit";

export function createOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is not set in the environment.");
  }

  return new Octokit({ auth: token });
}
