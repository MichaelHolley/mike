# eve Agent App

This project uses the eve framework. Before writing code, always read the relevant guide in `node_modules/eve/docs/`.

## Stack overview

### eve

The agent framework the app is built on. It owns the runtime: channels (HTTP session API, Discord), tool registration, and deployment to Vercel. The model is served via OpenRouter. Source lives under `agent/`; Guides are in `node_modules/eve/docs/`.

### blob-bunny

<https://github.com/MichaelHolley/blob-bunny> — a minimal HTTP blob store (Bun, self-hosted via Docker) used as the backend for the agent's persistent memory tools. Blobs are keyed by request pathname; all requests need `Authorization: Bearer <token>`. The client is `agent/lib/blob.ts`, shared by both the memory tools and the chat-history hook.

## Workspace structure

`agent/tools/` and `agent/lib/` are grouped by domain — `github/`, `memory/`, `chat/`. Add a new tool to the folder for its domain; add a new domain as a new folder in both places.

```
agent/
├── agent.ts                 # model + context window
├── instructions.md          # static prompt
├── instructions/            # dynamic prompt fragments
├── hooks/                   # event handlers
├── channels/                # discord, eve HTTP
├── tools/{github,memory,chat}/
└── lib/
    ├── {github,memory,chat}/   # domain helpers
    ├── blob.ts                 # shared: memory + chat both use it
    └── model-config.ts         # shared
```

Code shared by two domains goes at the `lib/` root, not inside one of them — burying it makes one domain depend on another.

**Tool names come from the path.** eve discovers `agent/tools/` recursively and derives the model-facing slug as the path under `tools/` with `/` replaced by `-`, so `tools/github/read_issue.ts` is called `github-read_issue`. Renaming or moving a tool file renames the tool the model sees: update `instructions.md` and any cross-tool mentions inside other tools' `description` fields in the same change. Verify with `npx eve info` (expect 0 diagnostics) and check the slugs in `.eve/compile/compiled-agent-manifest.json`.

## Imports

Every internal import uses the `#` subpath alias — no relative imports inside `agent/`:

```ts
import { getOwner } from "#lib/github/owner.js";   // yes
import { getOwner } from "../../lib/github/owner.js";  // no
import { getOwner } from "./owner.js";                 // no, even for a sibling
```

`#*` maps to `agent/*` via `package.json#imports`. Keep the `.js` extension: the `#*.js` → `./agent/*.ts` entry is what lets a `.js` specifier resolve to the real `.ts` file, under both eve's bundler and bare `node` (which strips types natively but never rewrites `.js` to `.ts` for relative specifiers — hence no relative imports, siblings included).

## Documentation

When a feature is added, removed or changed, update `README.md` (and any affected docs) in the same change.