"use client";
import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { TransactionsSkeleton } from "@/components/Skeletons";
import { useBankStore } from "@/lib/store";
import { rainClient } from "@/lib/rainClient";
import { ShoppingBag, Utensils, Tv, ArrowUpRight, Zap, Search, ArrowDownLeft, ArrowUpRight as SendIcon, RefreshCw } from "lucide-react";
import Link from "next/link";

type CardTx = {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  source: "card";
};

type ChainTx = {
  type: string;
  amount: bigint;
  mint: string;
  sig: string;
  ts: number;
  source: "chain";
};

type AnyTx = CardTx | ChainTx;

const MINT_LABELS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};
// mint field may already be a symbol string (e.g. "USDC") from addTx calls
function mintLabel(mint: string) { return MINT_LABELS[mint] ?? mint; }

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  food:          <Utensils className="w-4 h-4" />,
  shopping:      <ShoppingBag className="w-4 h-4" />,
  entertainment: <Tv className="w-4 h-4" />,
  topup:         <ArrowUpRight className="w-4 h-4" />,
  shield:        <ArrowDownLeft className="w-4 h-4" />,
  unshield:      <SendIcon className="w-4 h-4" />,
  send:          <SendIcon className="w-4 h-4" />,
  receive:       <ArrowDownLeft className="w-4 h-4" />,
};

function fmt(n: number) { return n.toFixed(2); }
function fmtBig(n: bigint, decimals = 6) { return (Number(n) / 10 ** decimals).toFixed(2); }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

const FILTERS = ["All", "Card", "Shield", "Send", "Receive"] as const;
type Filter = typeof FILTERS[number];

export default function TransactionsPage() {
  const { cardId, cardStatus, txHistory } = useBankStore();
  const [cardTxs, setCardTxs] = useState<CardTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!cardId || cardStatus === "not_issued") return;
    setLoading(true);
    rainClient.transactions(cardId)
      .then((r) => setCardTxs(r.transactions.map((t: any) => ({ ...t, source: "card" }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cardId]);

  if (!mounted) return <><Navbar /><TransactionsSkeleton /></>;

  const chainTxs: ChainTx[] = txHistory.map((t) => ({ ...t, source: "chain" }));

  const all: AnyTx[] = useMemo(() => {
    const merged: AnyTx[] = [
      ...cardTxs,
      ...chainTxs,
    ];
    // sort: card txs by date string, chain txs by ts
    return merged.sort((a, b) => {
      const ta = a.source === "card" ? new Date(a.date).getTime() / 1000 : a.ts;
      const tb = b.source === "card" ? new Date(b.date).getTime() / 1000 : b.ts;
      return tb - ta;
    });
  }, [cardTxs, chainTxs]);

  const filtered = useMemo(() => {
    return all.filter((tx) => {
      const matchesFilter = (() => {
        if (filter === "All") return true;
        if (filter === "Card") return tx.source === "card";
        if (filter === "Shield") return tx.source === "chain" && tx.type.toLowerCase() === "shield";
        if (filter === "Send") return tx.source === "chain" && tx.type.toLowerCase() === "send";
        if (filter === "Receive") return tx.source === "chain" && tx.type.toLowerCase() === "receive";
        return true;
      })();

      const q = search.toLowerCase();
      const matchesSearch = q === "" || (() => {
        if (tx.source === "card") return tx.merchant.toLowerCase().includes(q) || tx.category.includes(q);
        return tx.type.includes(q) || (MINT_LABELS[tx.mint] ?? tx.mint).toLowerCase().includes(q);
      })();

      return matchesFilter && matchesSearch;
    });
  }, [all, filter, search]);

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24 md:pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transactions</h1>
          {loading && <RefreshCw size={16} className="animate-spin text-gray-500" />}
        </div>

        {/* search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand transition"
          />
        </div>

        {/* filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === f ? "bg-brand text-white" : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">
            {all.length === 0 ? (
              <div className="space-y-2">
                <p>No transactions yet.</p>
                {cardStatus === "not_issued" && (
                  <p><Link href="/card" className="text-brand underline">Issue a card</Link> to start spending.</p>
                )}
              </div>
            ) : "No transactions match your search."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx, i) => {
              if (tx.source === "card") {
                const isTopup = tx.category === "topup";
                return (
                  <div key={tx.id} className="flex items-center justify-between bg-gray-900 border border-gray-800/60 rounded-xl px-4 py-3 hover:border-gray-700 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isTopup ? "bg-purple-900/50 text-purple-400" : "bg-gray-800 text-gray-400"}`}>
                        {CATEGORY_ICONS[tx.category] ?? <Zap className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.merchant}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{tx.date}</span>
                          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">Card</span>
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${isTopup ? "text-green-400" : "text-white"}`}>
                      {isTopup ? "+" : "−"}${fmt(tx.amount)}
                    </p>
                  </div>
                );
              }

              // chain tx
              const label = mintLabel(tx.mint);
              const isIncoming = tx.type.toLowerCase() === "receive" || tx.type.toLowerCase() === "shield";
              return (
                <div key={`${tx.sig}-${i}`} className="flex items-center justify-between bg-gray-900 border border-gray-800/60 rounded-xl px-4 py-3 hover:border-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIncoming ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                      {CATEGORY_ICONS[tx.type.toLowerCase()] ?? <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{tx.type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{fmtDate(tx.ts)}</span>
                        <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">On-chain</span>
                        <a href={`https://solscan.io/tx/${tx.sig}`} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-brand hover:underline">View</a>
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${isIncoming ? "text-green-400" : "text-white"}`}>
                    {isIncoming ? "+" : "−"}{fmtBig(tx.amount)} {label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
