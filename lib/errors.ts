export function formatError(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;

  const err = e as any;

  // Detect insufficient SOL balance
  const fullStr = (() => { try { return JSON.stringify(e, Object.getOwnPropertyNames(e)); } catch { return ""; } })();
  if (
    fullStr.includes("insufficient funds") ||
    fullStr.includes("Insufficient funds") ||
    fullStr.includes("0x1") || // Solana program error 1 = insufficient lamports
    (err.code === "REGISTRATION_TRANSACTION_SEND" && err.cause?.cause?.message?.includes("7050012"))
  ) {
    return "Insufficient SOL balance. You need at least 0.01 SOL in your wallet to cover transaction fees. Please top up and try again.";
  }

  // Network-level fetch failure during SDK transaction send (CORS, RPC unreachable, offline)
  if (
    err.code === "REGISTRATION_TRANSACTION_SEND" &&
    (err.cause?.name === "TypeError" || err.cause?.message === "Failed to fetch")
  ) {
    return "Network error: Could not reach the Solana RPC or Umbra relayer. Please check your connection and try again.";
  }

  // RPC returned HTTP 4xx/5xx (e.g. 403 from QuickNode domain restriction)
  if (err.code === "REGISTRATION_TRANSACTION_SEND" && err.cause?.message?.includes("statusCode=403")) {
    return "RPC access denied (403). The RPC endpoint is blocking requests from this domain. Please contact support.";
  }
  if (err.cause?.message?.includes("statusCode=403") || fullStr.includes("statusCode=403")) {
    return "RPC access denied (403). The RPC endpoint is blocking requests from this domain.";
  }

  const parts: string[] = [];

  if (err.message) parts.push(err.message);
  if (err.cause) {
    const cause = err.cause;
    if (cause.message) parts.push(`Cause: ${cause.message}`);
    if (cause.cause?.message) parts.push(`Root cause: ${cause.cause.message}`);
    if (cause.logs?.length) parts.push(`Logs:\n${cause.logs.join("\n")}`);
    if (cause.cause?.logs?.length) parts.push(`Logs:\n${cause.cause.logs.join("\n")}`);
    if (cause.data) parts.push(`Data: ${JSON.stringify(cause.data, null, 2)}`);
  }
  if (err.status || err.statusCode) parts.push(`HTTP ${err.status ?? err.statusCode}`);
  if (err.url) parts.push(`URL: ${err.url}`);
  if (err.code) parts.push(`Code: ${err.code}`);
  if (err.logs?.length) parts.push(`Logs:\n${err.logs.join("\n")}`);

  try {
    const full = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
    if (full && full !== "{}") parts.push(`\nFull error:\n${full}`);
  } catch (_) {}

  return parts.length ? parts.join("\n") : String(e);
}
