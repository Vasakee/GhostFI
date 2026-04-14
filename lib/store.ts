import { create } from "zustand";

interface BankStore {
  registered: boolean;
  shieldedBalances: Record<string, bigint>;
  pendingUtxos: any[];
  txHistory: { type: string; amount: bigint; mint: string; sig: string; ts: number }[];
  // Card state (persisted to localStorage)
  cardId: string | null;
  cardStatus: "not_issued" | "active" | "frozen";
  cardLast4: string | null;
  cardExpiry: string | null;
  cardBalance: number;
  setRegistered: (v: boolean) => void;
  setShieldedBalance: (mint: string, amount: bigint) => void;
  setPendingUtxos: (utxos: any[]) => void;
  addTx: (tx: BankStore["txHistory"][0]) => void;
  setCard: (card: { cardId: string; last4: string; expiry: string }) => void;
  setCardStatus: (status: BankStore["cardStatus"]) => void;
  setCardBalance: (balance: number) => void;
}

function ls(key: string) {
  return typeof window !== "undefined" ? localStorage.getItem(key) : null;
}

export const useBankStore = create<BankStore>((set) => ({
  registered: false,
  shieldedBalances: {},
  pendingUtxos: [],
  txHistory: [],
  cardId: ls("cardId"),
  cardStatus: (ls("cardStatus") as BankStore["cardStatus"]) ?? "not_issued",
  cardLast4: ls("cardLast4"),
  cardExpiry: ls("cardExpiry"),
  cardBalance: Number(ls("cardBalance") ?? 0),
  setRegistered: (registered) => set({ registered }),
  setShieldedBalance: (mint, amount) =>
    set((s) => ({ shieldedBalances: { ...s.shieldedBalances, [mint]: amount } })),
  setPendingUtxos: (pendingUtxos) => set({ pendingUtxos }),
  addTx: (tx) => set((s) => ({ txHistory: [tx, ...s.txHistory] })),
  setCard: ({ cardId, last4, expiry }) => {
    localStorage.setItem("cardId", cardId);
    localStorage.setItem("cardLast4", last4);
    localStorage.setItem("cardExpiry", expiry);
    localStorage.setItem("cardStatus", "active");
    set({ cardId, cardLast4: last4, cardExpiry: expiry, cardStatus: "active" });
  },
  setCardStatus: (cardStatus) => {
    localStorage.setItem("cardStatus", cardStatus);
    set({ cardStatus });
  },
  setCardBalance: (cardBalance) => {
    localStorage.setItem("cardBalance", String(cardBalance));
    set({ cardBalance });
  },
}));
