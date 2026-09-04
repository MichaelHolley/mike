import assert from "node:assert/strict";
import test from "node:test";
import { findHistoryEntries, searchHistory, type ChatHistoryEntry } from "#lib/chat/history.js";

const entries: ChatHistoryEntry[] = [
  { role: "user", author: "Alice", text: "Plan the deploy", at: "2026-01-01T00:00:00Z" },
  { role: "agent", author: "mike", text: "Deployment is ready", at: "2026-01-01T00:01:00Z" },
  { role: "user", author: "Bob", text: "Deploy it", at: "2026-01-01T00:02:00Z" },
];

test("findHistoryEntries searches case-insensitively and keeps the newest matches ordered", () => {
  assert.deepEqual(findHistoryEntries(entries, "DEPLOY", 2), {
    total: 3,
    matches: entries.slice(1),
  });
  assert.deepEqual(findHistoryEntries(entries, "ALICE", 10), {
    total: 1,
    matches: [entries[0]],
  });
  assert.deepEqual(findHistoryEntries(entries, "  ", 10), { total: 0, matches: [] });
});

test("searchHistory degrades read errors to unavailable history", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(await searchHistory("invalid/channel", "deploy", 10), null);
  } finally {
    console.error = originalError;
  }
});
