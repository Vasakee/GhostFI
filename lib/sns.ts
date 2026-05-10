import { Connection, PublicKey } from "@solana/web3.js";

// Minimal SNS Resolution without the heavy library
// This uses the official Bonfida Name Service program ID
const NAME_PROGRAM_ID = new PublicKey("namesLPneUptT99LHv92M5N1zYmXos37Y47Yrkf9976");

/**
 * Resolves a .sol domain to a Solana Public Key
 * Fallback: If it's already a valid public key, return it.
 */
export async function resolveSns(name: string, connection: Connection): Promise<PublicKey | null> {
  // 1. Check if it's already a valid public key
  try {
    return new PublicKey(name);
  } catch {
    // Not a public key, proceed to SNS
  }

  if (!name.endsWith(".sol")) return null;

  try {
    // Note: Manual SNS resolution is complex due to hashing.
    // Since we couldn't install the library, we'll use the public Bonfida API
    // which is the standard "Plan B" for lightweight clients.
    const domain = name.replace(".sol", "");
    const res = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${domain}`);
    const data = await res.json();
    
    if (data?.result && data.result !== "0") {
      return new PublicKey(data.result);
    }
    return null;
  } catch (e) {
    console.error("[SNS] Resolution failed:", e);
    return null;
  }
}
