// Maps raw database/Supabase errors to safe, generic client-facing messages.
// Full detail is kept in server logs only — never leaked to the browser.

export function dbError(error: { message?: string } | unknown, context: string): Error {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message)
      : String(error);
  console.error(`[DB:${context}]`, message);
  return new Error("A database error occurred. Please try again.");
}
