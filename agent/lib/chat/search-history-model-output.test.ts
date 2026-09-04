import assert from "node:assert/strict";
import test from "node:test";
import tool from "#tools/chat/search_history.js";

test("search history model output keeps the newest complete entries within its limit", async () => {
  const matches = Array.from({ length: 10 }, (_, index) => ({
    role: "user" as const,
    author: "Alice",
    text: String(index).repeat(2000),
    at: `2026-01-01T00:00:0${index}Z`,
  }));
  const output = await tool.toModelOutput!({ supported: true, available: true, total: 10, matches });

  if (output.type !== "text") throw new Error("Expected text tool output.");
  assert.ok(output.value.length <= 8000);
  assert.deepEqual(JSON.parse(output.value).matches.map((entry: { text: string }) => entry.text[0]), [
    "7",
    "8",
    "9",
  ]);
});
