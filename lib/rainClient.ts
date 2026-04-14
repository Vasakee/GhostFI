// Client-side wrapper — proxies all Rain calls through /api/card to keep RAIN_API_KEY server-side
async function cardApi(action: string, args: Record<string, unknown> = {}) {
  const res = await fetch("/api/card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...args }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Card API error");
  return data;
}

export const rainClient = {
  issue:        (userId: string, name: string, email: string) => cardApi("issue", { userId, name, email }),
  details:      (cardId: string) => cardApi("details", { cardId }),
  topup:        (cardId: string, amount: number) => cardApi("topup", { cardId, amount }),
  balance:      (cardId: string) => cardApi("balance", { cardId }),
  transactions: (cardId: string) => cardApi("transactions", { cardId }),
  freeze:       (cardId: string) => cardApi("freeze", { cardId }),
  unfreeze:     (cardId: string) => cardApi("unfreeze", { cardId }),
};
