"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Eye, EyeOff, TrendingUp, Wallet } from "lucide-react";
import { getClient, SUPPORTED_TOKENS, PUSD_MINT } from "@/lib/umbra";
import { registerAccount, shieldTokens, unshieldTokens, fetchEncryptedBalances } from "@/lib/actions";
import { getPusdQuote, buildPusdSwapTx, executePusdSwap } from "@/lib/pusd";
import { useBankStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

type Toast = { id: number; message: string; ok: boolean };

export default function Dashboard() {
  const { connected, publicKey, signTransaction, signMessage } = useWallet();
  const { registered, shieldedBalances, txHistory, setRegistered, setShieldedBalance, addTx } = useBankStore();
  const [loading, setLoading] = useState("");
  const [shieldAmt, setShieldAmt] = useState("");
  const [unshieldAmt, setUnshieldAmt] = useState("");
  const [selectedMint, setSelectedMint] = useState(SUPPORTED_TOKENS[0].mint);
  const [errorMsg, setErrorMsg] = useState("");
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [publicTokenBalances, setPublicTokenBalances] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [swapFromMint, setSwapFromMint] = useState(SUPPORTED_TOKENS[0].mint);
  const [swapAmt, setSwapAmt] = useState("");
  const [swapQuote, setSwapQuote] = useState<{ outAmount: string; priceImpactPct: string } | null>(null);
  const [swapLoading, setSwapLoading] = useState("");

  const token = SUPPORTED_TOKENS.find((t) => t.mint === selectedMint)!;
  const network = process.env.NEXT_PUBLIC_NETWORK ?? "mainnet";
  const privateBalance = Number(shieldedBalances[selectedMint] ?? 0n) / 10 ** token.decimals;

  function showToast(message: string, ok: boolean) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, ok }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function fetchPublicBalances(address: string) {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
    const [solRes, tokenRes, token2022Res] = await Promise.all([
      fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }) }).then((r) => r.json()),
      fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getTokenAccountsByOwner",
          params: [address, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }] }) }).then((r) => r.json()),
      fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "getTokenAccountsByOwner",
          params: [address, { programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }, { encoding: "jsonParsed" }] }) }).then((r) => r.json()),
    ]);
    if (solRes.result?.value != null) setSolBalance(solRes.result.value / 1e9);
    const balances: Record<string, number> = {};
    for (const { account } of [...(tokenRes.result?.value ?? []), ...(token2022Res.result?.value ?? [])]) {
      const info = account.data.parsed.info;
      balances[info.mint] = info.tokenAmount.uiAmount ?? 0;
    }
    setPublicTokenBalances(balances);
  }

  useEffect(() => {
    if (localStorage.getItem("ghostfi_registered") === "true") setRegistered(true);
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    fetchPublicBalances(publicKey.toBase58()).catch(console.error);
  }, [publicKey?.toBase58()]);

  useEffect(() => {
    if (!publicKey || !signTransaction || !signMessage) return;
    getClient(publicKey.toBase58(), signTransaction as any, signMessage as any)
      .then((client) => fetchEncryptedBalances(client, SUPPORTED_TOKENS.map((t) => t.mint)))
      .then((balances) => { for (const [mint, amount] of balances.entries()) setShieldedBalance(mint, amount); })
      .catch(() => {});
  }, [publicKey?.toBase58()]);

  async function refreshBalances() {
    if (!publicKey || !signTransaction || !signMessage) return;
    setRefreshing(true);
    try {
      const address = publicKey.toBase58();
      const client = await getClient(address, signTransaction as any, signMessage as any);
      const balances = await fetchEncryptedBalances(client, SUPPORTED_TOKENS.map((t) => t.mint));
      for (const [mint, amount] of balances.entries()) setShieldedBalance(mint, amount);
      await fetchPublicBalances(address);
    } catch (_) {}
    setRefreshing(false);
  }

  async function getUmbraClient() {
    if (!publicKey || !signTransaction || !signMessage) throw new Error("Wallet not connected");
    return getClient(publicKey.toBase58(), signTransaction as any, signMessage as any);
  }

  async function handleAirdrop() {
    setLoading("Airdropping...");
    try {
      const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
      const address = publicKey!.toBase58();
      const res = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "requestAirdrop", params: [address, 2_000_000_000] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      await fetchPublicBalances(address);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setLoading("");
  }

  async function handleRegister() {
    setLoading("Registering...");
    try {
      const client = await getUmbraClient();
      await registerAccount(client);
      setRegistered(true);
      showToast("Account registered!", true);
    } catch (e: any) {
      showToast("Registration failed: " + formatError(e), false);
      setErrorMsg(formatError(e));
    }
    setLoading("");
  }

  async function handleShield() {
    const available = publicTokenBalances[selectedMint] ?? 0;
    if (parseFloat(shieldAmt) > available) {
      showToast(`Insufficient balance. You have ${available} ${token.symbol}`, false);
      return;
    }
    setLoading("Shielding...");
    try {
      const client = await getUmbraClient();
      const amount = BigInt(Math.round(parseFloat(shieldAmt) * 10 ** token.decimals));
      const result = await shieldTokens(client, selectedMint, amount);
      addTx({ type: "Shield", amount, mint: token.symbol, sig: result.queueSignature, ts: Date.now() });
      await refreshBalances();
      setShieldAmt("");
      showToast(`Shielded ${shieldAmt} ${token.symbol}!`, true);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setLoading("");
  }

  async function handleUnshield() {
    setLoading("Unshielding...");
    try {
      const client = await getUmbraClient();
      const amount = BigInt(Math.round(parseFloat(unshieldAmt) * 10 ** token.decimals));
      const result = await unshieldTokens(client, selectedMint, amount);
      addTx({ type: "Unshield", amount, mint: token.symbol, sig: result.queueSignature, ts: Date.now() });
      await refreshBalances();
      setUnshieldAmt("");
      showToast(`Unshielded ${unshieldAmt} ${token.symbol}!`, true);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setLoading("");
  }

  async function handleGetSwapQuote() {
    if (!swapAmt || parseFloat(swapAmt) <= 0) return;
    setSwapLoading("quote");
    try {
      const quote = await getPusdQuote(swapFromMint, Math.round(parseFloat(swapAmt) * 1e6));
      setSwapQuote({ outAmount: quote.outAmount, priceImpactPct: quote.priceImpactPct });
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setSwapLoading("");
  }

  async function handleSwapToPusd() {
    if (!swapQuote || !publicKey || !signTransaction) return;
    setSwapLoading("swap");
    try {
      const quote = await getPusdQuote(swapFromMint, Math.round(parseFloat(swapAmt) * 1e6));
      const tx = await buildPusdSwapTx(quote, publicKey.toBase58());
      const sig = await executePusdSwap(tx, signTransaction as any, process.env.NEXT_PUBLIC_RPC_URL!);
      addTx({ type: "Swap→PUSD", amount: BigInt(quote.outAmount), mint: "PUSD", sig, ts: Date.now() });
      await fetchPublicBalances(publicKey.toBase58());
      setSwapAmt(""); setSwapQuote(null);
      showToast(`Swapped to ${(Number(quote.outAmount) / 1e6).toFixed(2)} PUSD!`, true);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setSwapLoading("");
  }

  if (!connected) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Wallet size={28} className="text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Connect your wallet</p>
            <p className="text-sm text-gray-500 mt-1">Use the button in the top right to get started.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-enter px-4 py-3 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2 ${
            t.ok ? "bg-green-600/90 backdrop-blur text-white" : "bg-red-600/90 backdrop-blur text-white"
          }`}>
            <span>{t.ok ? "✓" : "✗"}</span>
            {t.message}
          </div>
        ))}
      </div>

      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Private Balance Card */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-purple-600/30 via-violet-600/20 to-transparent border border-purple-500/20">
          <div className="absolute inset-0 card-shimmer pointer-events-none" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-purple-300 font-medium">Private Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setBalanceHidden((h) => !h)} className="text-purple-300/60 hover:text-purple-300 transition">
                  {balanceHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={refreshBalances} disabled={refreshing} className="text-purple-300/60 hover:text-purple-300 transition">
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div>
              <p className="text-4xl font-black tracking-tight">
                {balanceHidden ? "••••••" : `${privateBalance.toFixed(2)}`}
                <span className="text-xl font-semibold text-purple-300 ml-2">{token.symbol}</span>
              </p>
              <p className="text-xs text-purple-400/60 mt-1">🔒 Encrypted on-chain — only you can see this</p>
            </div>

            {/* Token tabs */}
            <div className="flex gap-2 flex-wrap">
              {SUPPORTED_TOKENS.map((t) => (
                <button
                  key={t.mint}
                  onClick={() => setSelectedMint(t.mint)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedMint === t.mint
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-purple-300/60 hover:bg-white/10 hover:text-purple-300"
                  }`}
                >
                  {t.symbol}
                  {"tag" in t && (
                    <span className="ml-1.5 text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                      {(t as any).tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Register banner */}
        {!registered && (
          <div className="glass rounded-2xl p-5 border border-purple-500/20 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Set up your GhostFi account</p>
              <p className="text-xs text-gray-500 mt-0.5">One-time on-chain registration to enable private balances.</p>
            </div>
            <button
              onClick={handleRegister}
              disabled={!!loading || !publicKey}
              className="flex-shrink-0 btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
            >
              {loading === "Registering..." ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Register"}
            </button>
          </div>
        )}

        {/* Shield / Unshield */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <ArrowDownLeft size={15} className="text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Shield</p>
                <p className="text-xs text-gray-500">Public → Private</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={shieldAmt}
                onChange={(e) => setShieldAmt(e.target.value)}
                className="input-ghost w-full rounded-xl px-4 py-3 text-sm pr-16"
              />
              <button
                onClick={() => setShieldAmt(String(publicTokenBalances[selectedMint] ?? 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-semibold"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-600">Available: {(publicTokenBalances[selectedMint] ?? 0).toFixed(2)} {token.symbol}</p>
            <button
              onClick={handleShield}
              disabled={!!loading || !shieldAmt || !publicKey || !registered}
              className="w-full btn-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading === "Shielding..." ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Shield →"}
            </button>
          </div>

          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gray-500/15 flex items-center justify-center">
                <ArrowUpRight size={15} className="text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Unshield</p>
                <p className="text-xs text-gray-500">Private → Public</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={unshieldAmt}
                onChange={(e) => setUnshieldAmt(e.target.value)}
                className="input-ghost w-full rounded-xl px-4 py-3 text-sm pr-16"
              />
              <button
                onClick={() => setUnshieldAmt(privateBalance.toFixed(token.decimals))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-semibold"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-600">Private: {privateBalance.toFixed(2)} {token.symbol}</p>
            <button
              onClick={handleUnshield}
              disabled={!!loading || !unshieldAmt || !publicKey || !registered}
              className="w-full bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {loading === "Unshielding..." ? (
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              ) : "← Unshield"}
            </button>
          </div>
        </div>

        {/* PUSD Swap */}
        <div className="glass rounded-2xl p-5 space-y-4 border border-green-500/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
                <TrendingUp size={15} className="text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Get PUSD</p>
                <p className="text-xs text-gray-500">Swap to non-freezable stablecoin</p>
              </div>
            </div>
            <span className="text-[10px] bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full font-semibold">non-freezable</span>
          </div>

          <div className="flex gap-2">
            {SUPPORTED_TOKENS.filter((t) => t.symbol !== "PUSD").map((t) => (
              <button
                key={t.mint}
                onClick={() => { setSwapFromMint(t.mint); setSwapQuote(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  swapFromMint === t.mint ? "bg-green-600/80 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {t.symbol}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={swapAmt}
              onChange={(e) => { setSwapAmt(e.target.value); setSwapQuote(null); }}
              className="input-ghost flex-1 rounded-xl px-4 py-3 text-sm"
            />
            <button
              onClick={handleGetSwapQuote}
              disabled={!!swapLoading || !swapAmt}
              className="bg-white/5 hover:bg-white/10 border border-white/8 px-4 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
            >
              {swapLoading === "quote" ? (
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              ) : "Quote"}
            </button>
          </div>

          {swapQuote && (
            <div className="bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">You receive</span>
                <span className="text-green-400 font-semibold">{(Number(swapQuote.outAmount) / 1e6).toFixed(4)} PUSD</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Price impact</span>
                <span className="text-gray-400">{parseFloat(swapQuote.priceImpactPct).toFixed(3)}%</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSwapToPusd}
            disabled={!!swapLoading || !swapQuote || !publicKey}
            className="w-full bg-green-700/80 hover:bg-green-600/80 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {swapLoading === "swap" ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "Swap → PUSD 🌴"}
          </button>
        </div>

        {/* Wallet balances + SOL */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Public Wallet</p>
            {network === "devnet" && solBalance !== null && solBalance < 0.5 && (
              <button
                onClick={handleAirdrop}
                disabled={!!loading}
                className="text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-3 py-1 rounded-lg font-semibold transition disabled:opacity-40"
              >
                {loading === "Airdropping..." ? "Airdropping…" : "Airdrop 2 SOL"}
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">SOL</span>
              <span className="font-semibold">{solBalance !== null ? `${solBalance.toFixed(4)}` : "—"}</span>
            </div>
            {SUPPORTED_TOKENS.map((t) => (
              <div key={t.mint} className="flex justify-between text-sm">
                <span className="text-gray-400">{t.symbol}</span>
                <span className="font-semibold">{(publicTokenBalances[t.mint] ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        {txHistory.length > 0 && (
          <div className="glass rounded-2xl p-5 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Recent Activity</p>
            <div className="space-y-2">
              {txHistory.slice(0, 5).map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                      tx.type === "Shield" || tx.type === "Receive" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
                    }`}>
                      {tx.type === "Shield" || tx.type === "Receive" ? "↓" : "↑"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.type}</p>
                      <p className="text-xs text-gray-600">{new Date(tx.ts).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{(Number(tx.amount) / 1e6).toFixed(2)} {tx.mint}</p>
                    <a href={`https://solscan.io/tx/${tx.sig}`} target="_blank" rel="noreferrer"
                      className="text-[10px] text-purple-400 hover:underline">View ↗</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
