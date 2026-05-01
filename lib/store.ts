import { create } from "zustand";

interface BankStore {
  registered: boolean;
  shieldedBalances: Record<string, bigint>;
  pendingUtxos: any[];
  txHistory: { type: string; amount: bigint; mint: string; sig: string; ts: number }[];
  cardId: string | null;
  cardStatus: "not_issued" | "active" | "frozen";
  cardLast4: string | null;
  cardExpiry: string | null;
  cardBalance: number;
  cardholderName: string | null;
  _hydrated: boolean;
  setRegistered: (v: boolean) => void;
  setShieldedBalance: (mint: string, amount: bigint) => void;
  setPendingUtxos: (utxos: any[]) => void;
  addTx: (tx: BankStore["txHistory"][0]) => void;
  setCard: (card: { cardId: string; last4: string; expiry: string; name: string }) => void;
  setCardStatus: (status: BankStore["cardStatus"]) => void;
  setCardBalance: (balance: number) => void;
  hydrate: () => void;
}

// Always start with defaults — rehydrate from localStorage client-side only
export const useBankStore = create<BankStore>((set) => ({
  registered: false,
  shieldedBalances: {},
  pendingUtxos: [],
  txHistory: [],
  cardId: null,
  cardStatus: "not_issued",
  cardLast4: null,
  cardExpiry: null,
  cardBalance: 0,
  cardholderName: null,
  _hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      set({
        registered: localStorage.getItem("ghostfi_registered") === "true",
        cardId: localStorage.getItem("cardId"),
        cardStatus: (localStorage.getItem("cardStatus") as BankStore["cardStatus"]) ?? "not_issued",
        cardLast4: localStorage.getItem("cardLast4"),
        cardExpiry: localStorage.getItem("cardExpiry"),
        cardBalance: Number(localStorage.getItem("cardBalance") ?? 0),
        cardholderName: localStorage.getItem("cardholderName"),
        _hydrated: true,
      });
    } catch (e) {
      console.warn("localStorage hydration failed:", e);
      set({ _hydrated: true });
    }
  },

  setRegistered: (registered) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem("ghostfi_registered", String(registered));
    } catch (e) {}
    set({ registered });
  },
  setShieldedBalance: (mint, amount) =>
    set((s) => ({ shieldedBalances: { ...s.shieldedBalances, [mint]: amount } })),
  setPendingUtxos: (pendingUtxos) => set({ pendingUtxos }),
  addTx: (tx) => set((s) => ({ txHistory: [tx, ...s.txHistory] })),
  setCard: ({ cardId, last4, expiry, name }) => {
    localStorage.setItem("cardId", cardId);
    localStorage.setItem("cardLast4", last4);
    localStorage.setItem("cardExpiry", expiry);
    localStorage.setItem("cardStatus", "active");
    localStorage.setItem("cardholderName", name);
    set({ cardId, cardLast4: last4, cardExpiry: expiry, cardStatus: "active", cardholderName: name });
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
