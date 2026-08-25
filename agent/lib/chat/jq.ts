import { JqError, type JqInput, loadJq, type Jq } from "jq-wasm/inline";

/** Compiled once per warm runtime; the wasm is embedded in the `/inline` build, so no disk asset to resolve. */
let jqPromise: Promise<Jq> | undefined;

export type JqOutcome =
  | { ok: true; results: unknown[] }
  | { ok: false; error: string };

/**
 * Runs a jq filter over `input`. The filter is the model's; `input` is untrusted
 * data passed as jq's stdin, never concatenated into the program — so history
 * content cannot alter the filter.
 */
export async function runJq(input: JqInput, filter: string): Promise<JqOutcome> {
  const jq = await (jqPromise ??= loadJq());
  try {
    return { ok: true, results: jq.json(input, filter) };
  } catch (error) {
    if (error instanceof JqError) {
      return { ok: false, error: error.stderr.trim() || error.message };
    }
    throw error;
  }
}
