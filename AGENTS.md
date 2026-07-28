# eve Agent App

This project uses the eve framework. Before writing code, always read the relevant guide in `node_modules/eve/docs/`.

## Stack overview

### eve

The agent framework the app is built on. It owns the runtime: channels (HTTP session API, Discord), tool registration, and deployment to Vercel. The model is served via OpenRouter. Source lives under `agent/`; Guides are in `node_modules/eve/docs/`.

### blob-bunny

<https://github.com/MichaelHolley/blob-bunny> — a minimal HTTP blob store (Bun, self-hosted via Docker) used as the backend for the agent's persistent memory tools. Blobs are keyed by request pathname; all requests need `Authorization: Bearer <token>`.

## Documentation

When a feature is added, removed or changed, update `README.md` (and any affected docs) in the same change.