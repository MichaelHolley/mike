const DEFAULT_MODEL = "openai/gpt-5.4-mini";
const DEFAULT_MODEL_CONTEXT_WINDOW_TOKENS = 400_000;

export function getModel() {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

export function getModelContextWindowTokens() {
  const raw = process.env.OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS;
  if (!raw) {
    return DEFAULT_MODEL_CONTEXT_WINDOW_TOKENS;
  }

  const tokens = Number(raw);
  if (!Number.isFinite(tokens) || tokens <= 0) {
    throw new Error(
      `OPENROUTER_MODEL_CONTEXT_WINDOW_TOKENS must be a positive number, got "${raw}".`,
    );
  }

  return tokens;
}
