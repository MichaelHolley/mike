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

Both are locked to repos owned by `MichaelHolley` (`agent/lib/get-owner.ts`); a bare repo name or a matching `owner/repo` slug is accepted. Requires `GITHUB_TOKEN` (PAT with `repo` scope).

### Memory (`agent/tools/`)

Persistent notes stored across conversations, backed by [blob-bunny](https://github.com/MichaelHolley/blob-bunny):

- `write_memory` — save/replace a memory by name, with a short description.
- `read_memory` — read a memory's full content by name.
- `list_memory` — list the memory map (name + description of each entry).
- `delete_memory` — remove a memory by name.

Memory names are slugs (letters, numbers, dashes, underscores, `/` to nest); the map itself is auto-maintained at the reserved `MEMORY` name. Requires `BLOB_BUNNY_URL` and `BLOB_BUNNY_TOKEN`.

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```