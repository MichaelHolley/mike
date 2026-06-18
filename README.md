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

## Register slash commands

`scripts/register-commands.ts` registers the Discord slash commands (edit the `commands` array to change them). Each run `PUT`s, replacing the whole command set for that scope. Needs `DISCORD_APPLICATION_ID` + `DISCORD_BOT_TOKEN` (from `.env`).

```bash
pnpm discord:register              # global scope (~1h to propagate)
pnpm discord:register <GUILD_ID>   # guild scope (instant)
```