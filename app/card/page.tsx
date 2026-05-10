"use client";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, Eye, EyeOff, Snowflake, Zap, ShoppingBag, Utensils, Tv, ArrowUpRight, AlertTriangle, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";
import { useBankStore } from "@/lib/store";
import { rainClient } from "@/lib/rainClient";
import { SUPPORTED_TOKENS } from "@/lib/umbra";

const USDC_MINT = SUPPORTED_TOKENS[0].mint;
const fmt = (n: number) => n.toFixed(2);
const fmtCardNum = (raw: string) => raw.replace(/(.{4})/g, "$1 ").trim();

function CategoryIcon({ cat }: { cat: string }) {
  const cls = "w-4 h-4";
  switch (cat) {
    case "food":          return <Utensils className={cls} />;
    case "shopping":      return <ShoppingBag className={cls} />;
    case "entertainment": return <Tv className={cls} />;
    case "topup":         return <ArrowUpRight className={cls} />;
    default:              return <Zap className={cls} />;
  }
}

// ── Card face ─────────────────────────────────────────────────────────────────

function CardFace({ last4, expiry, name, revealed, cardNumber, cvv, frozen }: {
  last4: string; expiry: string; name: string;
  revealed: boolean; cardNumber: string; cvv: string; frozen: boolean;
}) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{ paddingBottom: "63%", background: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 55%, #0f172a 100%)" }}>

      {/* shimmer */}
      <div className="absolute inset-0 card-shimmer pointer-events-none rounded-2xl" />

      {/* frozen tint */}
      {frozen && <div className="absolute inset-0 bg-blue-900/30 rounded-2xl" />}

      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        {/* row 1: logo + chip */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base tracking-wide leading-none">GhostFi</p>
            <p className="text-purple-300 text-[10px] tracking-widest mt-0.5">VIRTUAL CARD</p>
          </div>
          {/* EMV chip */}
          <svg width="38" height="30" viewBox="0 0 38 30">
            <rect width="38" height="30" rx="4" fill="#c9a84c"/>
            <rect x="14" y="0" width="10" height="30" fill="#a07830" opacity="0.5"/>
            <rect x="0" y="10" width="38" height="10" fill="#a07830" opacity="0.5"/>
            <rect x="14" y="10" width="10" height="10" rx="1" fill="#e8c060" opacity="0.7"/>
          </svg>
        </div>

        {/* row 2: card number */}
        <div>
          <p className="font-mono text-white text-lg tracking-[0.2em]">
            {revealed ? fmtCardNum(cardNumber) : `•••• •••• •••• ${last4}`}
          </p>
          {revealed && (
            <p className="text-purple-300 text-xs font-mono mt-1">CVV: {cvv}</p>
          )}
        </div>

        {/* row 3: name + expiry + visa */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-purple-300 text-[9px] uppercase tracking-widest">Card Holder</p>
            <p className="text-white text-sm font-medium truncate max-w-[140px]">{name || "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-purple-300 text-[9px] uppercase tracking-widest">Expires</p>
            <p className="text-white text-sm font-mono">{expiry}</p>
          </div>
          <span className="text-white font-black text-2xl italic" style={{ fontFamily: "Georgia, serif", letterSpacing: "-1px" }}>
            VISA
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Issue flow ────────────────────────────────────────────────────────────────

function IssueFlow({ onIssued }: { onIssued: () => void }) {
  const { publicKey } = useWallet();
  const { setCard } = useBankStore();
  const [step, setStep] = useState<"form" | "issuing" | "done">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function handleIssue() {
    if (!name || !email) return;
    setStep("issuing");
    try {
      const result = await rainClient.issue(publicKey?.toBase58() ?? "anon", name, email);
      setCard({ cardId: result.cardId, last4: result.last4, expiry: result.expiry, name });
      setStep("done");
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
      setTimeout(onIssued, 2200);
    } catch (e: any) {
      setError(formatError(e));
      setStep("form");
    }
  }

  const STEPS = ["Verify", "Issue", "Ready"];
  const idx = step === "form" ? 0 : step === "issuing" ? 1 : 2;

  return (
    <div className="max-w-sm mx-auto py-12 space-y-8">
      {/* stepper */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < idx ? "bg-green-600 text-white" : i === idx ? "bg-brand text-white" : "bg-gray-800 text-gray-500"}`}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs ${i <= idx ? "text-white" : "text-gray-600"}`}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-1 ${i < idx ? "bg-green-600" : "bg-gray-700"}`} />
            )}
          </div>
        ))}
      </div>

      {step === "done" ? (
        <div className="text-center space-y-4 py-8">
          <div className="text-5xl">🎉</div>
          <p className="text-2xl font-bold">Your card is ready!</p>
          <p className="text-gray-400 text-sm">Setting things up…</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-5">
          <div>
            <h2 className="text-xl font-bold">Get your virtual card</h2>
            <p className="text-gray-400 text-sm mt-1">Spend your private balance anywhere Visa is accepted.</p>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              disabled={step === "issuing"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition disabled:opacity-50" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email"
              disabled={step === "issuing"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition disabled:opacity-50" />
          </div>
          <button onClick={handleIssue} disabled={!name || !email || step === "issuing"}
            className="w-full bg-brand hover:bg-brand-dark py-3 rounded-xl font-semibold disabled:opacity-40 transition">
            {step === "issuing" ? "Issuing card…" : "Issue Virtual Card →"}
          </button>
          <p className="text-xs text-gray-600 text-center">Powered by Rain · Visa Virtual Card</p>
        </div>
      )}
    </div>
  );
}

// ── Top-up modal ──────────────────────────────────────────────────────────────

function TopUpModal({ cardId, shieldedUsdc, cardBalance, onClose, onSuccess }: {
  cardId: string; shieldedUsdc: number; cardBalance: number;
  onClose: () => void; onSuccess: (newBal: number) => void;
}) {
  const [tab, setTab] = useState<"how" | "manual">("how");

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Top up card</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition text-lg leading-none">×</button>
        </div>

        {/* tabs */}
        <div className="flex gap-2">
          {(["how", "manual"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${tab === t ? "bg-brand text-white" : "bg-gray-800 text-gray-400"}`}>
              {t === "how" ? "How it works" : "Fund my card"}
            </button>
          ))}
        </div>

        {tab === "how" ? (
          <div className="space-y-3 text-sm text-gray-300">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Why can't it be automatic?</p>
            <p>Your GhostFi balance is in <span className="text-white font-medium">USDC</span> (crypto). Your card spends <span className="text-white font-medium">USD</span> (real dollars). Converting between them requires a licensed money service — something we're working on adding.</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-4">In the meantime — 4 simple steps</p>
            <ol className="space-y-3">
              {[
                { n: "1", text: "Go to your Dashboard and Unshield the USDC you want to spend back to your wallet." },
                { n: "2", text: "Send that USDC to Coinbase, Binance, or any exchange you use." },
                { n: "3", text: "Sell the USDC for USD and withdraw to your bank account." },
                { n: "4", text: "Use your bank to load your Lithic card (via the Lithic dashboard or bank transfer)." },
              ].map(({ n, text }) => (
                <li key={n} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                  <span className="text-gray-300 text-sm">{text}</span>
                </li>
              ))}
            </ol>
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl px-3 py-2.5 text-xs text-purple-300 mt-2">
              🔒 Your GhostFi balance stays private throughout — only the unshield step touches your public wallet.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Shielded balance</p>
                <p className="font-semibold text-sm">${fmt(shieldedUsdc)} <span className="text-gray-500 font-normal">USDC</span></p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Card balance</p>
                <p className="font-semibold text-sm">${fmt(cardBalance)} <span className="text-gray-500 font-normal">USD</span></p>
              </div>
            </div>
            <p className="text-sm text-gray-400">Follow the steps in <button onClick={() => setTab("how")} className="text-brand underline">How it works</button> to fund your card, then come back here to check your updated balance.</p>
            <button onClick={onClose} className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-sm font-semibold transition">
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CardPage() {
  const { publicKey } = useWallet();
  const { cardId, cardStatus, cardLast4, cardExpiry, cardBalance, cardholderName,
          shieldedBalances, setCardStatus, setCardBalance } = useBankStore();

  const [revealed, setRevealed] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [issued, setIssued] = useState(cardStatus !== "not_issued");
  const [copied, setCopied] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shieldedUsdc = Number(shieldedBalances[USDC_MINT] ?? 0n) / 1e6;

  useEffect(() => {
    if (!cardId) return;
    rainClient.balance(cardId).then(r => setCardBalance(r.balance)).catch(() => {});
    rainClient.transactions(cardId).then(r => setTransactions(r.transactions)).catch(() => {});
  }, [cardId]);

  async function handleReveal() {
    if (revealed) { setRevealed(false); return; }
    if (!cardId) return;
    try {
      const d = await rainClient.details(cardId);
      setCardNumber(d.cardNumber);
      setCvv(d.cvv);
      setRevealed(true);
      if (revealTimer.current) clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealed(false), 10_000);
    } catch (e: any) { setErrorMsg(formatError(e)); }
  }

  async function handleFreeze() {
    if (!cardId) return;
    try {
      if (cardStatus === "frozen") { await rainClient.unfreeze(cardId); setCardStatus("active"); }
      else { await rainClient.freeze(cardId); setCardStatus("frozen"); }
    } catch (e: any) { setErrorMsg(formatError(e)); }
  }

  async function handleCopy() {
    if (!cardId) return;
    try {
      const d = await rainClient.details(cardId);
      await navigator.clipboard.writeText(fmtCardNum(d.cardNumber));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) { setErrorMsg(formatError(e)); }
  }

  if (!issued) {
    return (
      <>
        <Navbar />
        {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
        <main className="max-w-lg mx-auto px-4">
          <IssueFlow onIssued={() => setIssued(true)} />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      {showTopUp && cardId && (
        <TopUpModal cardId={cardId} shieldedUsdc={shieldedUsdc} cardBalance={cardBalance}
          onClose={() => setShowTopUp(false)}
          onSuccess={bal => { setCardBalance(bal); setShowTopUp(false); }} />
      )}

      <main className="max-w-lg mx-auto px-4 py-6 sm:py-8 space-y-5 pb-28 md:pb-8">
        <p className="text-center text-xs text-purple-400 tracking-widest uppercase">🔒 Funded privately. Spend freely.</p>

        {/* card */}
        <div className={`transition-all duration-300 ${cardStatus === "frozen" ? "opacity-60 saturate-50" : ""}`}>
          <CardFace last4={cardLast4 ?? "••••"} expiry={cardExpiry ?? "••/••"}
            name={cardholderName ?? "—"} revealed={revealed} cardNumber={cardNumber} cvv={cvv}
            frozen={cardStatus === "frozen"} />
          {cardStatus === "frozen" && (
            <p className="text-center text-blue-400 text-xs mt-2">❄ Card is frozen</p>
          )}
        </div>

        {/* action buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: revealed ? "Hide" : "Reveal", icon: revealed ? <EyeOff size={16}/> : <Eye size={16}/>, onClick: handleReveal, active: revealed },
            { label: copied ? "Copied!" : "Copy", icon: <Copy size={16}/>, onClick: handleCopy, active: copied },
            { label: cardStatus === "frozen" ? "Unfreeze" : "Freeze", icon: <Snowflake size={16}/>, onClick: handleFreeze, active: cardStatus === "frozen" },
            { label: "Apple Pay", icon: <span className="text-sm">🍎</span>, onClick: () => {}, disabled: true },
          ].map(({ label, icon, onClick, active, disabled }) => (
            <button key={label} onClick={onClick} disabled={disabled}
              className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition
                ${disabled ? "bg-gray-900 opacity-40 cursor-not-allowed"
                  : active ? "bg-brand/20 text-brand border border-brand/30"
                  : "bg-gray-900 hover:bg-gray-800 text-gray-300"}`}>
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* balance */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Spendable Balance</p>
              <p className="text-4xl font-bold tracking-tight">${fmt(cardBalance)}</p>
              <p className="text-xs text-gray-500 mt-1">{fmt(cardBalance)} USDC</p>
            </div>
            <button onClick={() => setShowTopUp(true)}
              className="bg-brand hover:bg-brand-dark px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-brand/20">
              Top Up
            </button>
          </div>
          {cardBalance < 10 && (
            <div className="flex items-center gap-2 mt-4 bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-3 py-2.5 text-xs text-yellow-400">
              <AlertTriangle size={13} />
              Low balance — top up to keep spending
            </div>
          )}
        </div>

        {/* transactions */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recent Transactions</p>
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">No transactions yet</div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-gray-900 border border-gray-800/60 rounded-xl px-4 py-3 hover:border-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                      ${tx.category === "topup" ? "bg-purple-900/50 text-purple-400" : "bg-gray-800 text-gray-400"}`}>
                      <CategoryIcon cat={tx.category} />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{tx.merchant}</p>
                      <p className={`text-xs mt-0.5 ${tx.category === "topup" ? "text-purple-400" : "text-gray-500"}`}>
                        {tx.category === "topup" ? "Funded privately from GhostFi" : tx.date}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${tx.category === "topup" ? "text-green-400" : "text-white"}`}>
                    {tx.category === "topup" ? "+" : "−"}${fmt(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
