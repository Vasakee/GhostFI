// Rain Card API — server-side only. Falls back to mock when RAIN_API_KEY is not set.

const API_KEY = process.env.RAIN_API_KEY;
const API_URL = process.env.RAIN_API_URL ?? "https://sandbox.rain.com";
const MOCK = !API_KEY;

const MOCK_TXS = [
  { id: "t1", merchant: "Netflix", amount: 15.99, currency: "USD", date: "2026-04-13", category: "entertainment" },
  { id: "t2", merchant: "Uber Eats", amount: 32.50, currency: "USD", date: "2026-04-12", category: "food" },
  { id: "t3", merchant: "Amazon", amount: 89.00, currency: "USD", date: "2026-04-10", category: "shopping" },
  { id: "t4", merchant: "ShieldPay Top-up", amount: 200.00, currency: "USD", date: "2026-04-09", category: "topup" },
];

async function rainFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`Rain API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function issueCard(userId: string, name: string, email: string) {
  if (MOCK) return { cardId: `mock_${userId.slice(0, 8)}`, last4: "4242", expiry: "12/28", status: "active" };
  return rainFetch("/cards", { method: "POST", body: JSON.stringify({ userId, name, email, type: "virtual", network: "visa" }) });
}

export async function getCardDetails(_cardId: string) {
  if (MOCK) return { cardNumber: "4242424242424242", cvv: "737", expiry: "12/28" };
  return rainFetch(`/cards/${_cardId}/sensitive`);
}

export async function topUpCard(cardId: string, amount: number, currency = "USD") {
  if (MOCK) return { success: true, newBalance: amount };
  return rainFetch(`/cards/${cardId}/topup`, { method: "POST", body: JSON.stringify({ amount, currency }) });
}

export async function getCardBalance(cardId: string) {
  if (MOCK) return { balance: 142.50, currency: "USD" };
  return rainFetch(`/cards/${cardId}/balance`);
}

export async function getCardTransactions(cardId: string) {
  if (MOCK) return { transactions: MOCK_TXS };
  return rainFetch(`/cards/${cardId}/transactions`);
}

export async function freezeCard(cardId: string) {
  if (MOCK) return { status: "frozen" };
  return rainFetch(`/cards/${cardId}/freeze`, { method: "POST" });
}

export async function unfreezeCard(cardId: string) {
  if (MOCK) return { status: "active" };
  return rainFetch(`/cards/${cardId}/unfreeze`, { method: "POST" });
}
