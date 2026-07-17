import { defineTool } from "eve/tools";
import { z } from "zod";
import { getMemoryIndex } from "../lib/memory-index.js";

export default defineTool({
  description:
    "List stored memories — persistent notes you have saved across " +
    "conversations. Returns the memory map: each entry's name and a short " +
    "description. Call read_memory to get a specific memory's full content.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    index: z.string().nullable(),
  }),
  async execute() {
    return { index: await getMemoryIndex() };
  },
  toModelOutput(output) {
    if (!output.index) {
      return { type: "text", value: "No memories stored." };
    }
    return { type: "text", value: output.index };
  },
});
