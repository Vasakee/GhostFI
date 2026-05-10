// Raenest (Superteam Nigeria) integration — server-side only.
// This handles virtual card issuance and local Nigerian bank payouts.

const API_KEY = process.env.RAENEST_SECRET_KEY;
const BASE = process.env.RAENEST_BASE_URL || "https://api.raenest.com/v1";
const MOCK = !API_KEY;

async function raenestFetch(path: string, options?: RequestInit) {
  if (MOCK) {
    console.log(`[Raenest MOCK] ${options?.method || "GET"} ${path}`);
    return null;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`Raenest API ${res.status}: ${await res.text()}`);
  return res.json();
}

/** 
 * Issue a Raenest Virtual USD Card
 * Track: Superteam Nigeria x Raenest
 */
export async function issueRaenestCard(userId: string, firstName: string, lastName: string, email: string) {
  if (MOCK) return { cardId: `rn_${Date.now()}`, last4: "8899", expiry: "12/28", status: "active", provider: "Raenest" };
  
  const data = await raenestFetch("/cards", {
    method: "POST",
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email: email,
      currency: "USD",
      type: "VIRTUAL",
      design: "GHOSTFI_BLACK"
    }),
  });
  
  return {
    cardId: data.id,
    last4: data.last_four,
    expiry: `${data.expiry_month}/${data.expiry_year.slice(-2)}`,
    status: data.status,
    provider: "Raenest"
  };
}

/** 
 * Withdraw funds to a Nigerian Bank Account
 * Track: Superteam Nigeria x Raenest
 */
export async function withdrawToBank(phoneNumber: string, bankCode: string, accountNumber: string, amountNgn: number) {
  if (MOCK) return { status: "pending", reference: `tx_${Date.now()}` };
  
  const data = await raenestFetch("/payouts", {
    method: "POST",
    body: JSON.stringify({
      amount: amountNgn,
      currency: "NGN",
      account_number: accountNumber,
      bank_code: bankCode,
      narration: "GhostFi Withdrawal",
      metadata: { phone: phoneNumber }
    }),
  });
  
  return {
    status: data.status,
    reference: data.reference
  };
}

/** Get list of supported Nigerian banks */
export async function getNigerianBanks() {
  if (MOCK) return [
    { name: "GTBank", code: "058" },
    { name: "Zenith Bank", code: "057" },
    { name: "Kuda Bank", code: "090267" },
    { name: "Access Bank", code: "044" }
  ];
  const data = await raenestFetch("/banks?country=NG");
  return data.banks.map((b: any) => ({ name: b.name, code: b.code }));
}

/** Get balance of a specific card */
export async function getRaenestCardBalance(cardId: string) {
  if (MOCK) return { balance: 10.50, currency: "USD" };
  const data = await raenestFetch(`/cards/${cardId}`);
  return {
    balance: parseFloat(data.balance || "0"),
    currency: data.currency || "USD"
  };
}

export const raenest = {
  issueCard: issueRaenestCard,
  payout: withdrawToBank,
  getBanks: getNigerianBanks,
  getBalance: getRaenestCardBalance,
};
