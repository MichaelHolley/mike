# mike

An [eve](https://eve.dev) agent app (model via OpenRouter), self-hosted as a Docker image.

## Develop & deploy

```bash
pnpm install
pnpm dev          # local dev (loopback-only auth)
pnpm typecheck
```

Pushes to `main` publish the Docker image to Docker Hub. See [docs/deployment.md](docs/deployment.md) for the image, the Docker Compose setup and the reverse proxy requirements.

## Channels

- **eve** (`agent/channels/eve.ts`) — HTTP session API, open only under `pnpm dev` and closed in production; its public health route stays up.
- **discord** (`agent/channels/discord.ts`) — slash commands at `POST /eve/v1/discord`. Set `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN` (see `.env.example`); point the app's Interactions Endpoint URL at that route.

## Tools

### GitHub (`agent/tools/github/`)

- `github-create_issue` — create an issue (title, body, optional labels).
- `github-list_issues` — list issues, filterable by state, labels, and assignee.
- `github-read_issue` — read one issue by number, including its full body.
- `github-edit_issue` — update an existing issue's title and/or body.

All are locked to repos owned by `MichaelHolley` (`agent/lib/github/owner.ts`); a bare repo name or a matching `owner/repo` slug is accepted. Requires `GITHUB_TOKEN` (PAT with `repo` scope).

### Memory (`agent/tools/memory/`)

Persistent notes stored across conversations, one row per memory in the SQLite database (see [Storage](#storage)):

- `memory-list` — list the memory map (id, title and description of each memory).
- `memory-search` — case-insensitive substring search over title, description and content, ranked by relevance; returns each match's id, title, description and a snippet.
- `memory-read` — read a memory's full content by id.
- `memory-write` — without an id, create a memory (title, description, content); with an id, update only the passed fields, replacing content as a whole.
- `memory-delete` — remove a memory by id and title. Requires human approval on every call; refuses if the title doesn't match the stored one, so the approval prompt always names what gets deleted.

Memory is global — shared across every channel and user.

## Storage

Memory lives in one SQLite file at `DATABASE_PATH` (default `./data/mike.db`, gitignored; `/app/data/mike.db` in the Docker image, on the volume described in [docs/deployment.md](docs/deployment.md)), using Node's built-in `node:sqlite` — no native dependency and no separate service. `agent/lib/db.ts` opens it lazily in WAL mode and applies ordered migrations tracked via `PRAGMA user_version`. Search uses FTS5 with the `trigram` tokenizer (case-insensitive substring matching); queries shorter than 3 characters fall back to `LIKE`.

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```
