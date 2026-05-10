import { TransactionInstruction, PublicKey } from "@solana/web3.js";

/**
 * Dune Analytics Integration
 * 
 * Dune indexes on-chain data by looking for specific patterns.
 * By adding a "Memo" instruction to our transactions, we make them
 * easily indexable and searchable on Dune Dashboards.
 */

const MEMO_PROGRAM_ID = "MemoSq4gqABAXibP2pMkw67K3N968vC2AqyP3NToX";

export type GhostFiActivity = 
  | "shield" 
  | "unshield" 
  | "send" 
  | "receive" 
  | "card_topup" 
  | "swap" 
  | "withdraw" 
  | "fund";

/**
 * Creates a Memo instruction for Dune indexing.
 * Format: GhostFi:[Activity]:[Platform]
 * Example: GhostFi:send:ussd
 */
export function createDuneMemo(activity: GhostFiActivity, platform: "ussd" | "whatsapp" | "web" = "web"): TransactionInstruction {
  const memoData = `GhostFi:${activity}:${platform}`;
  
  return new TransactionInstruction({
    keys: [],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(memoData, "utf-8"),
  });
}

/**
 * Track off-chain events (optional)
 * This won't cause "commotion" as it uses non-blocking fetches or background logging.
 */
export async function trackEvent(activity: GhostFiActivity, metadata: any = {}) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${activity}:`, metadata);
  }
  
  // Future: Send to a private analytics endpoint or Vercel Analytics
  // This is safe to fail and won't block the user's transaction.
}
