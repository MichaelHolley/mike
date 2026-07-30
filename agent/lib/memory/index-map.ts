import { getBlob, putBlob } from "../blob.js";
import { MEMORY_INDEX_NAME, MEMORY_PREFIX } from "./path.js";

const INDEX_PATH = `${MEMORY_PREFIX}${MEMORY_INDEX_NAME}.md`;

const INDEX_HEADER = `# Memory Index

Map of stored memories, maintained automatically — do not edit by hand.
`;

interface IndexEntry {
  name: string;
  description: string;
}

const ENTRY_LINE = /^- \[([^\]]+)\]\([^)]*\)\s+—\s+(.*)$/;

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseEntries(content: string): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(ENTRY_LINE);
    if (match) {
      entries.push({ name: match[1], description: match[2] });
    }
  }
  return entries;
}

function render(entries: IndexEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const body = sorted.length
    ? sorted.map((e) => `- [${e.name}](${e.name}.md) — ${e.description}`).join("\n")
    : "_No memories stored._";
  return `${INDEX_HEADER}\n${body}\n`;
}

async function readEntries(): Promise<IndexEntry[]> {
  const content = await getBlob(INDEX_PATH);
  return content ? parseEntries(content) : [];
}

export function getMemoryIndex(): Promise<string | null> {
  return getBlob(INDEX_PATH);
}

export async function upsertMemoryIndexEntry(
  name: string,
  description: string,
): Promise<void> {
  const entries = (await readEntries()).filter((e) => e.name !== name);
  entries.push({ name, description: oneLine(description) });
  await putBlob(INDEX_PATH, render(entries));
}

export async function removeMemoryIndexEntry(name: string): Promise<void> {
  const entries = (await readEntries()).filter((e) => e.name !== name);
  await putBlob(INDEX_PATH, render(entries));
}
