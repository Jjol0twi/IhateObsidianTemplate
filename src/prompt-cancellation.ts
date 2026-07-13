export class PromptCancelledError extends Error {
  constructor() {
    super("Template prompt was cancelled.");
    this.name = "PromptCancelledError";
  }
}

export function isPromptCancelled(error: unknown): boolean {
  return error instanceof PromptCancelledError;
}
