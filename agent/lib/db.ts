import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DATABASE_PATH = "./data/mike.db";

/** Append-only: each entry runs once, in order, tracked by `PRAGMA user_version`. */
const MIGRATIONS = [
  `
  CREATE TABLE memories (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE memories_fts USING fts5(
    title, description, content,
    content='memories', content_rowid='id', tokenize='trigram'
  );
  CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, title, description, content)
    VALUES (new.id, new.title, new.description, new.content);
  END;
  CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, title, description, content)
    VALUES ('delete', old.id, old.title, old.description, old.content);
  END;
  CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, title, description, content)
    VALUES ('delete', old.id, old.title, old.description, old.content);
    INSERT INTO memories_fts(rowid, title, description, content)
    VALUES (new.id, new.title, new.description, new.content);
  END;

  CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY,
    channel_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    at TEXT NOT NULL
  );
  CREATE INDEX chat_messages_channel_at ON chat_messages (channel_id, at);
  CREATE VIRTUAL TABLE chat_messages_fts USING fts5(
    author, text,
    content='chat_messages', content_rowid='id', tokenize='trigram'
  );
  CREATE TRIGGER chat_messages_ai AFTER INSERT ON chat_messages BEGIN
    INSERT INTO chat_messages_fts(rowid, author, text) VALUES (new.id, new.author, new.text);
  END;
  CREATE TRIGGER chat_messages_ad AFTER DELETE ON chat_messages BEGIN
    INSERT INTO chat_messages_fts(chat_messages_fts, rowid, author, text)
    VALUES ('delete', old.id, old.author, old.text);
  END;
  `,
];

let db: DatabaseSync | undefined;

function migrate(conn: DatabaseSync): void {
  const { user_version: version } = conn.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  for (let next = version; next < MIGRATIONS.length; next += 1) {
    conn.exec("BEGIN");
    try {
      conn.exec(MIGRATIONS[next]);
      conn.exec(`PRAGMA user_version = ${next + 1}`);
      conn.exec("COMMIT");
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  }
}

export function getDb(): DatabaseSync {
  if (db) return db;
  const path = process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH;
  mkdirSync(dirname(path), { recursive: true });
  const conn = new DatabaseSync(path);
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  migrate(conn);
  db = conn;
  return db;
}

/** The trigram tokenizer cannot match anything shorter than one trigram. */
const MIN_FTS_QUERY_CHARS = 3;

const SNIPPET_OPEN = "**";
const SNIPPET_CLOSE = "**";
const SNIPPET_ELLIPSIS = "…";
// Trigram tokens advance one character each, so this is roughly the snippet length in characters.
const SNIPPET_TOKENS = 64;

export type TextSearch =
  | { kind: "fts"; match: string }
  | { kind: "like"; pattern: string; needle: string };

/** Picks FTS5 for queries the trigram index can serve and `LIKE` for shorter ones. */
export function textSearch(query: string): TextSearch {
  const needle = query.trim();
  if (needle.length >= MIN_FTS_QUERY_CHARS) {
    return { kind: "fts", match: `"${needle.replaceAll('"', '""')}"` };
  }
  return { kind: "like", pattern: `%${needle.replace(/[\\%_]/g, "\\$&")}%`, needle };
}

/** SQL for FTS5 `snippet()` over `column` of `table`, with the shared markers. */
export function snippetSql(table: string, column: number): string {
  return `snippet(${table}, ${column}, '${SNIPPET_OPEN}', '${SNIPPET_CLOSE}', '${SNIPPET_ELLIPSIS}', ${SNIPPET_TOKENS})`;
}

/** JS counterpart of `snippet()` for `LIKE` matches, which FTS5 cannot highlight. */
export function excerpt(text: string, needle: string): string {
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  const radius = SNIPPET_TOKENS / 2;
  if (index < 0) {
    return text.length > SNIPPET_TOKENS ? text.slice(0, SNIPPET_TOKENS) + SNIPPET_ELLIPSIS : text;
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return (
    (start > 0 ? SNIPPET_ELLIPSIS : "") +
    text.slice(start, index) +
    SNIPPET_OPEN +
    text.slice(index, index + needle.length) +
    SNIPPET_CLOSE +
    text.slice(index + needle.length, end) +
    (end < text.length ? SNIPPET_ELLIPSIS : "")
  );
}
