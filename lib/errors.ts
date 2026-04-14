export function formatError(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;

  const err = e as any;
  const parts: string[] = [];

  if (err.message) parts.push(err.message);
  if (err.cause) {
    const cause = err.cause;
    if (cause.message) parts.push(`Cause: ${cause.message}`);
    if (cause.cause?.message) parts.push(`Root cause: ${cause.cause.message}`);
    // Solana simulation logs
    if (cause.logs?.length) parts.push(`Logs:\n${cause.logs.join("\n")}`);
    if (cause.cause?.logs?.length) parts.push(`Logs:\n${cause.cause.logs.join("\n")}`);
    // RPC error details
    if (cause.data) parts.push(`Data: ${JSON.stringify(cause.data, null, 2)}`);
  }
  if (err.status || err.statusCode) parts.push(`HTTP ${err.status ?? err.statusCode}`);
  if (err.url) parts.push(`URL: ${err.url}`);
  if (err.code) parts.push(`Code: ${err.code}`);
  if (err.logs?.length) parts.push(`Logs:\n${err.logs.join("\n")}`);

  // Walk the full error chain as JSON fallback
  try {
    const full = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
    if (full && full !== "{}") parts.push(`\nFull error:\n${full}`);
  } catch (_) {}

  return parts.length ? parts.join("\n") : String(e);
}
