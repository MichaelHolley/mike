# mike

An [eve](https://eve.dev) agent app (model via OpenRouter), self-hosted as a Docker image.

## Develop & deploy

```bash
pnpm install
pnpm dev          # local dev (loopback-only auth)
pnpm relay        # Discord Gateway relay; set EVE_URL to the URL `pnpm dev` prints
pnpm typecheck
```

CI (`.github/workflows/ci.yml`) runs `pnpm typecheck` and fails on any `eve info` diagnostics, on every pull request and push to `main`.

Pushes to `main` also publish two Docker images to Docker Hub: the agent and the Discord Gateway relay. See [docs/deployment.md](docs/deployment.md) for the images, the Docker Compose setup, the reverse proxy requirements and the Discord setup.

Run only one relay per bot, locally included: stop the production relay while you test against `pnpm dev`, or the bot answers twice.

## Channels

- **eve** (`agent/channels/eve.ts`) — HTTP session API, open only under `pnpm dev` and closed in production; its public health route stays up.
- **discord** (`agent/channels/discord.ts`) — `@mike` mentions, DMs and thread replies, forwarded by the relay to `POST /eve/v1/discord/gateway`. Button presses (approvals) still arrive at `POST /eve/v1/discord`, so the app's Interactions Endpoint URL stays pointed at that route. Set `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN` and `DISCORD_RELAY_SECRET` (see `.env.example`).

### Talking to mike on Discord

- `@mike <message>` in a text channel opens a public thread named after the message, adds you, and answers there. The thread is one conversation: follow up without mentioning the bot, and it remembers what was said earlier in the thread.
- Two mentions open two threads that never share context.
- DMs are answered in the DM, one conversation per DM.
- Replying to any of the bot's messages continues that message's conversation.
- Everything else is ignored, and the bot never answers bots, itself included.

These are eve's defaults; the channel sets no `onCommand`, `onAnswers` or `onMessage` hook. That is deliberate: the defaults give a person the same identity for messages and button presses, so requester-only approvals keep working. The bot is not pinned to one server — keep **Public Bot** off in the Discord portal so only you can invite it.

### Discord Gateway relay (`relay/main.ts`)

Discord delivers ordinary messages only over its Gateway WebSocket, so a separate long-running process holds that connection and forwards each message to the agent over HTTP, authenticated with HTTP Basic using `DISCORD_RELAY_SECRET`. The agent refuses to start without that secret (`agent/instrumentation/require-relay-secret.ts`), so the Gateway route is never served unauthenticated. Gateway support is experimental in eve, so eve upgrades may require changes here.

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
