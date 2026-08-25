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

Discord has no durable session per channel, so each `/mike` command would otherwise start blind. The runtime records both sides of every exchange, replays the most recent ones on the next turn, and lets the agent search the rest on demand:

- Written by `agent/hooks/chat-history.ts` on `message.received` (the user message) and on `message.completed` (the reply, skipping `tool-calls` turns so only what the user actually saw is stored). The Discord channel's auth attributes carry the invoking `username`, so entries name their speaker.
- Replayed by `agent/instructions/chat-history.ts` on `turn.started`, as a system block marked untrusted data. Only the newest slice is replayed; the rest stays stored for search.
- Searched by the `chat-search_history` tool. It takes a `jq` filter and runs it over the full stored array for the current channel, resolved from verified auth so it cannot read another channel. jq runs in-process via the WebAssembly `jq-wasm` build (no binary, no sandbox); the model writes the filter while the history is passed as jq's input, so entry content can never alter the program. Deep recall beyond the replayed slice goes through here.
- Cleared by the `chat-clear_history` tool. It takes no arguments — the channel is resolved from verified auth, so a prompt injection cannot wipe another channel. It requires human approval on every call. The confirmation reply is itself recorded, so a wipe leaves the channel holding that one agent entry.

All logic lives in `agent/lib/chat/history.ts` (jq wrapper in `agent/lib/chat/jq.ts`); the hook, instructions, and tools are thin adapters. Retention is set by exported constants there: newest **500** entries, of which the newest **15** are replayed into the prompt, each clamped to **2000** characters on write, and entries older than **7 days** dropped from the replayed slice (search still sees them until they age out of the 500).

Storage is one blob per channel at `history/discord/<channel_id>.json`, holding a JSON array of `{ role, author, text, at }`. Same backend as memory, so the same `BLOB_BUNNY_URL` and `BLOB_BUNNY_TOKEN`. Reads and writes are best-effort: a blob-bunny outage is logged to stderr and the bot answers without memory rather than failing the turn.

**Known limitation:** each turn does read-modify-write, and blob-bunny has no conditional writes. Two genuinely concurrent turns in the same channel will lose one turn's entries. Accepted — fixing it needs conditional writes upstream in blob-bunny.

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```