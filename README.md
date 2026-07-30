# mike

An [eve](https://eve.dev) agent app (model via OpenRouter), deployed on Vercel.

## Develop & deploy

```bash
pnpm install
pnpm dev          # local dev (loopback-only auth)
pnpm typecheck
pnpm build && vercel deploy --prod
```

## Channels

- **eve** (`agent/channels/eve.ts`) — default HTTP session API.
- **discord** (`agent/channels/discord.ts`) — slash commands at `POST /eve/v1/discord`. Set `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN` (see `.env.example`); point the app's Interactions Endpoint URL at that route.

## Tools

### GitHub (`agent/tools/`)

- `create_github_issue` — create an issue (title, body, optional labels).
- `list_github_issues` — list issues, filterable by state, labels, and assignee.
- `read_github_issue` — read one issue by number, including its full body.
- `edit_github_issue` — update an existing issue's title and/or body.

All are locked to repos owned by `MichaelHolley` (`agent/lib/get-owner.ts`); a bare repo name or a matching `owner/repo` slug is accepted. Requires `GITHUB_TOKEN` (PAT with `repo` scope).

### Memory (`agent/tools/`)

Persistent notes stored across conversations, backed by [blob-bunny](https://github.com/MichaelHolley/blob-bunny):

- `write_memory` — save/replace a memory by name, with a short description.
- `read_memory` — read a memory's full content by name.
- `list_memory` — list the memory map (name + description of each entry).
- `delete_memory` — remove a memory by name.

Memory names are slugs (letters, numbers, dashes, underscores, `/` to nest); the map itself is auto-maintained at the reserved `MEMORY` name. Requires `BLOB_BUNNY_URL` and `BLOB_BUNNY_TOKEN`.

### Chat history (Discord only)

Discord has no durable session per channel, so each `/mike` command would otherwise start blind. The runtime records both sides of every exchange and replays them on the next turn:

- Written by `agent/hooks/chat-history.ts` on `message.received` (the user message) and on `message.completed` (the reply, skipping `tool-calls` turns so only what the user actually saw is stored). The Discord channel's auth attributes carry the invoking `username`, so entries name their speaker.
- Replayed by `agent/instructions/chat-history.ts` on `turn.started`, as a system block marked untrusted data.
- Cleared by the `clear_chat_history` tool. It takes no arguments — the channel is resolved from verified auth, so a prompt injection cannot wipe another channel. The confirmation reply is itself recorded, so a wipe leaves the channel holding that one agent entry.

All logic lives in `agent/lib/chat-history.ts`; the hook, instructions, and tool are thin adapters. Retention is set by exported constants there: newest **20** entries, each clamped to **2000** characters on write, and entries older than **7 days** dropped on read.

Storage is one blob per channel at `history/discord/<channel_id>.json`, holding a JSON array of `{ role, author, text, at }`. Same backend as memory, so the same `BLOB_BUNNY_URL` and `BLOB_BUNNY_TOKEN`. Reads and writes are best-effort: a blob-bunny outage is logged to stderr and the bot answers without memory rather than failing the turn.

**Known limitation:** each turn does read-modify-write, and blob-bunny has no conditional writes. Two genuinely concurrent turns in the same channel will lose one turn's entries. Accepted — fixing it needs conditional writes upstream in blob-bunny.

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```