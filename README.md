# mike

An [eve](https://eve.dev) agent app (model via OpenRouter), self-hosted as a Docker image.

## Develop & deploy

```bash
pnpm install
pnpm dev          # local dev (loopback-only auth)
pnpm typecheck
```

Pushes to `main` publish the image to Docker Hub as `<DOCKERHUB_USERNAME>/mike` (`.github/workflows/publish.yml`; needs the `DOCKERHUB_USERNAME` repo variable and the `DOCKERHUB_TOKEN` repo secret). Build it locally with `docker build -t mike .`.

### Docker

```yaml
services:
  mike:
    image: <DOCKERHUB_USERNAME>/mike:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: stack.env # Portainer writes stack env vars here; see .env.example
    volumes:
      - workflow-data:/app/.eve/.workflow-data

volumes:
  workflow-data:
```

- `/app/.eve/.workflow-data` holds durable run state; keep it on a named volume so in-flight runs survive container replacement. The container runs as `node` (uid 1000), so a bind-mounted host directory must be owned by it (`chown 1000:1000 <dir>`).
- Put it behind an HTTPS reverse proxy (Discord requires HTTPS) that forwards both `/eve/` and `/.well-known/workflow/` unchanged — runs stall if workflow callbacks can't reach the server.
- The container healthcheck probes the public `GET /eve/v1/health`.
- The built-in `bash`, `read_file` and `write_file` tools are disabled (`agent/tools/{bash,read_file,write_file}.ts`), so the agent needs no sandbox and the image builds with `--skip-sandbox-prewarm`.

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

Persistent notes stored across conversations, backed by [blob-bunny](https://github.com/MichaelHolley/blob-bunny):

- `memory-write` — save/replace a memory by name, with a short description.
- `memory-read` — read a memory's full content by name.
- `memory-list` — list the memory map (name + description of each entry).
- `memory-delete` — remove a memory by name. Requires human approval on every call.

Memory names are slugs (letters, numbers, dashes, underscores, `/` to nest); the map itself is auto-maintained at the reserved `MEMORY` name. Requires `BLOB_BUNNY_URL` and `BLOB_BUNNY_TOKEN`.

### Chat history (Discord only)

Discord has no durable session per channel, so each `/mike` command would otherwise start blind. The runtime records both sides of every exchange, replays the most recent ones on the next turn, and lets the agent search older retained messages:

- Written by `agent/hooks/chat-history.ts` on `message.received` (the user message) and on `message.completed` (the reply, skipping `tool-calls` turns so only what the user actually saw is stored). The Discord channel's auth attributes carry the invoking `username`, so entries name their speaker.
- Replayed by `agent/instructions/chat-history.ts` on `turn.started`, as a system block marked untrusted data. Only the newest slice is replayed; the rest remains available for search.
- Searched by the `chat-search_history` tool using a case-insensitive substring of message text or author name. It returns the newest matches in chronological order and searches only the current channel, resolved from verified auth. Search uses native TypeScript over the channel's bounded JSON blob and adds no dependency.
- Cleared by the `chat-clear_history` tool. It takes no arguments — the channel is resolved from verified auth, so a prompt injection cannot wipe another channel. It requires human approval on every call. The confirmation reply is itself recorded, so a wipe leaves the channel holding that one agent entry.

All logic lives in `agent/lib/chat/history.ts`; the hook, instructions, and tools are thin adapters. Retention is set by exported constants there: newest **500** entries, of which the newest **16** are replayed into the prompt, each clamped to **2000** characters on write. Entries older than **7 days** are omitted from automatic replay but remain searchable until displaced by the 500-entry cap.

Storage is one blob per channel at `history/discord/<channel_id>.json`, holding a JSON array of `{ role, author, text, at }`. Same backend as memory, so the same `BLOB_BUNNY_URL` and `BLOB_BUNNY_TOKEN`. Reads and writes are best-effort: a blob-bunny outage is logged to stderr and the bot answers without memory rather than failing the turn.

**Known limitation:** each turn does read-modify-write, and blob-bunny has no conditional writes. Two genuinely concurrent turns in the same channel will lose one turn's entries. Accepted — fixing it needs conditional writes upstream in blob-bunny.

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```
