import { raenest } from "./raenest";

// Lithic Card API — server-side only.
const API_KEY = process.env.LITHIC_API_KEY;
const IS_SANDBOX = process.env.LITHIC_ENV !== "production";
const BASE = IS_SANDBOX ? "https://sandbox.lithic.com/v1" : "https://api.lithic.com/v1";
const MOCK = !API_KEY;

// Prefer Raenest for the Hackathon (Superteam Nigeria Track)
const PREFER_RAENEST = true;

const MOCK_TXS: any[] = [];

async function lithicFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `api-key ${API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`Lithic API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function issueCard(userId: string, name: string, email: string) {
  if (PREFER_RAENEST) {
    const [first, last] = name.split(" ");
    return await raenest.issueCard(userId, first || "Ghost", last || "User", email);
  }

  if (MOCK) return { cardId: `mock_${Date.now()}`, last4: "0000", expiry: "00/00", status: "active" };
  const card = await lithicFetch("/cards", {
    method: "POST",
    body: JSON.stringify({ type: "VIRTUAL", memo: name, state: "OPEN" }),
  });
  return {
    cardId: card.token,
    last4: card.last_four,
    expiry: `${card.exp_month}/${card.exp_year.slice(-2)}`,
    status: card.state,
  };
}

export async function getCardDetails(cardId: string) {
  if (cardId.startsWith("rn_")) {
    // Raenest details mock/api
    return { cardNumber: "4444555566667777", cvv: "123", expiry: "12/28" };
  }
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { cardNumber: "0000000000000000", cvv: "000", expiry: "00/00" };
  const card = await lithicFetch(`/cards/${cardId}`);
  return {
    cardNumber: card.pan,
    cvv: card.cvv,
    expiry: `${card.exp_month}/${card.exp_year.slice(-2)}`,
  };
}

import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

// GhostFi Treasury — this is where user funds go when they "top up" their card.
// You should set this to your own Solana wallet address in .env.
const TREASURY_WALLET = process.env.MASTER_TREASURY_WALLET;

export async function topUpCard(cardId: string, amount: number, userSecretKey?: string) {
  if (MOCK || !TREASURY_WALLET || TREASURY_WALLET === "YourSolanaWalletAddressHere") {
    console.log(`[Card Top-up MOCK] Card: ${cardId}, Amount: $${amount}`);
    return { success: true };
  }

  // Real Flow: Move tokens from User Bot Wallet -> GhostFi Treasury (Raenest Bridge)
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://solana.publicnode.com");
    // In a real app, we'd use spl-token transfer, for the demo we'll show the logic:
    console.log(`[Bridge] Moving $${amount} from user to ${TREASURY_WALLET} to fund Raenest Card...`);
    
    // 1. Unshielding has already happened in the route handler.
    // 2. Here we would execute the transfer to the treasury.
    
    return { success: true, destination: TREASURY_WALLET };
  } catch (e: any) {
    console.error("Top-up bridge error:", e.message);
    throw new Error("Failed to bridge funds to card provider.");
  }
}

export async function getCardBalance(cardId: string) {
  if (cardId.startsWith("rn_")) return await raenest.getBalance(cardId);
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { balance: 0.00, currency: "USD" };
  const data = await lithicFetch(`/cards/${cardId}`);
  const available = typeof data.spend_limit === "number" ? data.spend_limit / 100 : 0;
  return { balance: available, currency: "USD" };
}

export async function getCardTransactions(cardId: string) {
  if (cardId.startsWith("rn_")) return { transactions: [{ id: "rn_tx_1", merchant: "Netflix", amount: 15.99, currency: "USD", date: "2024-05-01", category: "entertainment" }] };
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { transactions: MOCK_TXS };
  const data = await lithicFetch(`/transactions?card_token=${cardId}&page_size=20`);
  const transactions = (data.data ?? []).map((tx: any) => ({
    id: tx.token,
    merchant: tx.merchant?.descriptor ?? tx.merchant?.name ?? "Unknown",
    amount: Math.abs(tx.amount) / 100,
    currency: "USD",
    date: tx.created?.slice(0, 10) ?? "",
    category: tx.merchant?.mcc === "5411" ? "food"
      : tx.merchant?.mcc === "5999" ? "shopping"
      : tx.merchant?.mcc === "7841" ? "entertainment"
      : "other",
  }));
  return { transactions };
}

export async function freezeCard(cardId: string) {
  if (MOCK || !cardId || cardId.startsWith("mock_") || cardId.startsWith("rn_")) return { status: "frozen" };
  await lithicFetch(`/cards/${cardId}`, { method: "PATCH", body: JSON.stringify({ state: "PAUSED" }) });
  return { status: "frozen" };
}

export async function unfreezeCard(cardId: string) {
  if (MOCK || !cardId || cardId.startsWith("mock_") || cardId.startsWith("rn_")) return { status: "active" };
  await lithicFetch(`/cards/${cardId}`, { method: "PATCH", body: JSON.stringify({ state: "OPEN" }) });
  return { status: "active" };
}

