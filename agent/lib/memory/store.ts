import { excerpt, getDb, snippetSql, textSearch } from "#lib/db.js";

export interface MemorySummary {
  id: number;
  title: string;
  description: string;
}

export interface Memory extends MemorySummary {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySearchMatch extends MemorySummary {
  snippet: string;
}

export interface MemoryFields {
  title: string;
  description: string;
  content: string;
}

/** Descriptions render one per line in the map, so they must not break it. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function listMemories(): MemorySummary[] {
  return getDb()
    .prepare("SELECT id, title, description FROM memories ORDER BY title COLLATE NOCASE, id")
    .all() as unknown as MemorySummary[];
}

export function searchMemories(query: string, limit: number): MemorySearchMatch[] {
  const search = textSearch(query);
  const db = getDb();
  if (search.kind === "fts") {
    return db
      .prepare(
        `SELECT m.id, m.title, m.description, ${snippetSql("memories_fts", -1)} AS snippet
         FROM memories_fts JOIN memories m ON m.id = memories_fts.rowid
         WHERE memories_fts MATCH ?
         ORDER BY bm25(memories_fts)
         LIMIT ?`,
      )
      .all(search.match, limit) as unknown as MemorySearchMatch[];
  }
  const rows = db
    .prepare(
      `SELECT id, title, description, content FROM memories
       WHERE title LIKE ?1 ESCAPE '\\' OR description LIKE ?1 ESCAPE '\\' OR content LIKE ?1 ESCAPE '\\'
       ORDER BY updated_at DESC
       LIMIT ?2`,
    )
    .all(search.pattern, limit) as unknown as (MemorySummary & { content: string })[];
  return rows.map(({ content, ...summary }) => ({
    ...summary,
    snippet: excerpt(content, search.needle),
  }));
}

export function readMemory(id: number): Memory | null {
  const row = getDb()
    .prepare(
      `SELECT id, title, description, content, created_at AS createdAt, updated_at AS updatedAt
       FROM memories WHERE id = ?`,
    )
    .get(id);
  return (row as unknown as Memory | undefined) ?? null;
}

export function createMemory({ title, description, content }: MemoryFields): number {
  const now = new Date().toISOString();
  const { lastInsertRowid } = getDb()
    .prepare(
      `INSERT INTO memories (title, description, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(title.trim(), oneLine(description), content, now, now);
  return Number(lastInsertRowid);
}

/** Only the passed fields change; returns false when no memory has that id. */
export function updateMemory(id: number, fields: Partial<MemoryFields>): boolean {
  const { changes } = getDb()
    .prepare(
      `UPDATE memories SET
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         content = COALESCE(?, content),
         updated_at = ?
       WHERE id = ?`,
    )
    .run(
      fields.title?.trim() ?? null,
      fields.description === undefined ? null : oneLine(fields.description),
      fields.content ?? null,
      new Date().toISOString(),
      id,
    );
  return changes > 0;
}

export function deleteMemory(id: number): boolean {
  return getDb().prepare("DELETE FROM memories WHERE id = ?").run(id).changes > 0;
}
