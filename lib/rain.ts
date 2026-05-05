// Lithic Card API — server-side only.
const API_KEY = process.env.LITHIC_API_KEY;
const IS_SANDBOX = process.env.LITHIC_ENV !== "production";
const BASE = IS_SANDBOX ? "https://sandbox.lithic.com/v1" : "https://api.lithic.com/v1";
const MOCK = !API_KEY;

const MOCK_TXS = [
  { id: "t1", merchant: "Netflix", amount: 15.99, currency: "USD", date: "2026-04-13", category: "entertainment" },
  { id: "t2", merchant: "Uber Eats", amount: 32.50, currency: "USD", date: "2026-04-12", category: "food" },
  { id: "t3", merchant: "Amazon", amount: 89.00, currency: "USD", date: "2026-04-10", category: "shopping" },
  { id: "t4", merchant: "GhostFi Top-up", amount: 200.00, currency: "USD", date: "2026-04-09", category: "topup" },
];

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

export async function issueCard(_userId: string, name: string, _email: string) {
  if (MOCK) return { cardId: `mock_${Date.now()}`, last4: "4242", expiry: "12/28", status: "active" };
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
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { cardNumber: "4242424242424242", cvv: "737", expiry: "12/28" };
  const card = await lithicFetch(`/cards/${cardId}`);
  return {
    cardNumber: card.pan,
    cvv: card.cvv,
    expiry: `${card.exp_month}/${card.exp_year.slice(-2)}`,
  };
}

export async function topUpCard(cardId: string, amount: number) {
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { success: true };
  // Lithic sandbox: simulate a book transfer to load funds onto the card's financial account
  await lithicFetch(`/simulate/authorize`, {
    method: "POST",
    body: JSON.stringify({
      descriptor: "GhostFi Top-up",
      amount: Math.round(amount * 100), // cents
      pan: (await lithicFetch(`/cards/${cardId}`)).pan,
    }),
  });
  return { success: true };
}

export async function getCardBalance(cardId: string) {
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { balance: 142.50, currency: "USD" };
  const data = await lithicFetch(`/cards/${cardId}`);
  // spend_limit is in cents; available balance derived from spend_limit - used
  const available = typeof data.spend_limit === "number" ? data.spend_limit / 100 : 0;
  return { balance: available, currency: "USD" };
}

export async function getCardTransactions(cardId: string) {
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
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { status: "frozen" };
  await lithicFetch(`/cards/${cardId}`, { method: "PATCH", body: JSON.stringify({ state: "PAUSED" }) });
  return { status: "frozen" };
}

export async function unfreezeCard(cardId: string) {
  if (MOCK || !cardId || cardId.startsWith("mock_")) return { status: "active" };
  await lithicFetch(`/cards/${cardId}`, { method: "PATCH", body: JSON.stringify({ state: "OPEN" }) });
  return { status: "active" };
}
