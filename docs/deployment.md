# Deployment

Pushes to `main` publish two images to Docker Hub (`.github/workflows/publish.yml`; needs the `DOCKERHUB_USERNAME` repo variable and the `DOCKERHUB_TOKEN` repo secret):

- `<DOCKERHUB_USERNAME>/mike` — the agent. Build it locally with `docker build -t mike .`.
- `<DOCKERHUB_USERNAME>/mike-relay` — the Discord Gateway relay. Build it locally with `docker build -f relay/Dockerfile -t mike-relay .` (the repo root is the context: the relay installs from the root lockfile, so its eve version always matches the agent's).

## Docker Compose

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
      - data:/app/data

  relay:
    image: <DOCKERHUB_USERNAME>/mike-relay:latest
    restart: unless-stopped
    env_file: stack.env
    environment:
      EVE_URL: http://mike:3000
    depends_on:
      mike:
        condition: service_healthy

volumes:
  workflow-data:
  data:
```

- `/app/.eve/.workflow-data` holds durable run state; keep it on a named volume so in-flight runs survive container replacement. The container runs as `node` (uid 1000), so a bind-mounted host directory must be owned by it (`chown 1000:1000 <dir>`).
- `/app/data` holds `mike.db`, the SQLite database with memory; keep it on its own volume so it survives container replacement. The same uid 1000 ownership applies to a bind mount.
- Put the agent behind an HTTPS reverse proxy (Discord requires HTTPS) that forwards both `/eve/` and `/.well-known/workflow/` unchanged — runs stall if workflow callbacks can't reach the server. The relay reaches `/eve/v1/discord/gateway` over the internal Compose network, so the proxy doesn't need to expose that path; block it there if your proxy allows.
- The agent's healthcheck probes the public `GET /eve/v1/health`.
- The built-in `bash`, `read_file` and `write_file` tools are disabled (`agent/tools/{bash,read_file,write_file}.ts`), so the agent needs no sandbox and the image builds with `--skip-sandbox-prewarm`.

## The relay

- **Run exactly one relay, ever.** Every Gateway connection receives every message, so a second replica — or a local relay left running beside production — makes the bot answer every message twice. Never scale the `relay` service.
- **Messages sent while the relay is down are lost.** Discord doesn't replay them, so a redeploy or crash leaves a gap of a few seconds.
- It needs no volumes and no exposed port; its only connections are outbound.
- It reads `DISCORD_BOT_TOKEN`, `DISCORD_RELAY_SECRET` and `EVE_URL`. The agent needs the same `DISCORD_RELAY_SECRET` and refuses to start without it.
- It exits with an error when Discord refuses the bot token or the requested intents, so `restart: unless-stopped` loops on a misconfiguration. Read the relay's logs: a healthy start logs `Discord Gateway ready`.

## Discord setup

In the [Discord Developer Portal](https://discord.com/developers/applications), for the bot's application:

1. **Bot → Message Content Intent: on.** Do this before the relay first starts. The relay requests the intent, and Discord refuses the connection if it isn't enabled. Without it the bot ignores thread follow-ups that skip the mention.
2. **Bot → Public Bot: off**, so only you can add the bot to a server.
3. **General Information → Interactions Endpoint URL** stays `https://<your-host>/eve/v1/discord`. Approval buttons arrive there.
4. **Re-invite the bot** with the permissions threads need (View Channels, Send Messages, Send Messages in Threads, Create Public Threads, Read Message History). Replace `<APPLICATION_ID>`:

   ```text
   https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&scope=bot+applications.commands&permissions=309237713920
   ```

   If a mention gets its answer in the channel instead of in a new thread, the bot is missing **Create Public Threads**: eve falls back to the channel silently.

Mention the bot's user (`@mike`), not the role of the same name that Discord creates for it — a role mention doesn't address the bot.

## Upgrading from the `/mike` slash command

Do these once, in order, when first deploying the mention-based bot:

1. **Back up the database.** The new version drops the stored chat history on startup, irreversibly. Stop the `mike` container and copy `mike.db` (plus `mike.db-wal` and `mike.db-shm` if present) off the `data` volume.
2. **Clear the slash command** from both scopes. Registering an empty set replaces the whole command set, so this removes `/mike`:

   ```bash
   # global (can take up to an hour to disappear from the picker)
   curl -X PUT "https://discord.com/api/v10/applications/$DISCORD_APPLICATION_ID/commands" \
     -H "Authorization: Bot $DISCORD_BOT_TOKEN" -H "Content-Type: application/json" -d '[]'
   # each guild it was registered to
   curl -X PUT "https://discord.com/api/v10/applications/$DISCORD_APPLICATION_ID/guilds/<GUILD_ID>/commands" \
     -H "Authorization: Bot $DISCORD_BOT_TOKEN" -H "Content-Type: application/json" -d '[]'
   ```

3. Do the [Discord setup](#discord-setup) above.
4. Generate the shared secret with `openssl rand -hex 32` and add it to the stack env as `DISCORD_RELAY_SECRET`.
5. Deploy the Compose file above. Check that both containers are running, the relay logs `Discord Gateway ready`, and an `@mike` mention gets an answer in a new thread.
