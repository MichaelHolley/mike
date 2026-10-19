# Deployment

Pushes to `main` publish the image to Docker Hub as `<DOCKERHUB_USERNAME>/mike` (`.github/workflows/publish.yml`; needs the `DOCKERHUB_USERNAME` repo variable and the `DOCKERHUB_TOKEN` repo secret). Build it locally with `docker build -t mike .`.

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

volumes:
  workflow-data:
```

- `/app/.eve/.workflow-data` holds durable run state; keep it on a named volume so in-flight runs survive container replacement. The container runs as `node` (uid 1000), so a bind-mounted host directory must be owned by it (`chown 1000:1000 <dir>`).
- Put it behind an HTTPS reverse proxy (Discord requires HTTPS) that forwards both `/eve/` and `/.well-known/workflow/` unchanged — runs stall if workflow callbacks can't reach the server.
- The container healthcheck probes the public `GET /eve/v1/health`.
- The built-in `bash`, `read_file` and `write_file` tools are disabled (`agent/tools/{bash,read_file,write_file}.ts`), so the agent needs no sandbox and the image builds with `--skip-sandbox-prewarm`.
