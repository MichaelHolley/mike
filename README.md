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

### Chat history (Discord only)

Discord has no durable session per channel, so each `/mike` command would otherwise start blind. The runtime records both sides of every exchange, replays the most recent ones on the next turn, and lets the agent search older retained messages:

- Written by `agent/hooks/chat-history.ts` on `message.received` (the user message) and on `message.completed` (the reply, skipping `tool-calls` turns so only what the user actually saw is stored). The Discord channel's auth attributes carry the invoking `username`, so entries name their speaker.
- Replayed by `agent/instructions/chat-history.ts` on `turn.started`, as a system block marked untrusted data. Only the newest slice is replayed; the rest remains available for search.
- Searched by the `chat-search_history` tool using a case-insensitive substring of message text or author name. It returns the newest matches in chronological order, each as a snippet with author and timestamp, and searches only the current channel, resolved from verified auth. Total output is capped at 8000 characters.
- Cleared by the `chat-clear_history` tool. It takes no arguments — the channel is resolved from verified auth, so a prompt injection cannot wipe another channel. It requires human approval on every call. The confirmation reply is itself recorded, so a wipe leaves the channel holding that one agent entry.

All logic lives in `agent/lib/chat/history.ts`; the hook, instructions, and tools are thin adapters. Retention is set by exported constants there: messages are kept for **90 days** (pruned on each insert); the newest **16** from the last **7 days** are replayed into the prompt, each clamped to **2000** characters when replayed. Full text is stored and searchable.

Storage is one row per message in the `chat_messages` table, keyed by channel id. Inserts are atomic, so concurrent turns in the same channel never lose entries. Reads and writes are best-effort: a database error is logged to stderr and the bot answers without history rather than failing the turn.

## Storage

Memory and chat history share one SQLite file at `DATABASE_PATH` (default `./data/mike.db`, gitignored; `/app/data/mike.db` in the Docker image, on the volume described in [docs/deployment.md](docs/deployment.md)), using Node's built-in `node:sqlite` — no native dependency and no separate service. `agent/lib/db.ts` opens it lazily in WAL mode and applies ordered migrations tracked via `PRAGMA user_version`. Search uses FTS5 with the `trigram` tokenizer (case-insensitive substring matching); queries shorter than 3 characters fall back to `LIKE`.

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```
