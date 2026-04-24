"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { Send, Lock, ExternalLink, ChevronDown } from "lucide-react";
import { getClient, SUPPORTED_TOKENS } from "@/lib/umbra";
import { privateSend } from "@/lib/actions";
import { useBankStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

export default function SendPage() {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const { addTx, shieldedBalances } = useBankStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState(SUPPORTED_TOKENS[0].mint);
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const token = SUPPORTED_TOKENS.find((t) => t.mint === mint)!;
  const privateBalance = Number(shieldedBalances[mint] ?? 0n) / 10 ** token.decimals;

  async function handleSend() {
    setLoading(true);
    setTxSig("");
    try {
      if (!publicKey || !signTransaction || !signMessage) throw new Error("Wallet not connected");
      const client = await getClient(publicKey.toBase58(), signTransaction as any, signMessage as any);
      const amountBig = BigInt(Math.round(parseFloat(amount) * 10 ** token.decimals));
      const sigs = await privateSend(client, recipient, mint, amountBig);
      const sig = Array.isArray(sigs) ? sigs[0] : (sigs as any);
      setTxSig(sig);
      addTx({ type: "Send", amount: amountBig, mint: token.symbol, sig, ts: Date.now() });
      setRecipient("");
      setAmount("");
    } catch (e: any) {
      setErrorMsg(formatError(e));
    }
    setLoading(false);
  }

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send size={20} className="text-purple-400" /> Private Send
          </h1>
          <p className="text-gray-500 text-sm">Zero on-chain link between you and the recipient.</p>
        </div>

        {/* Main card */}
        <div className="glass rounded-2xl p-5 space-y-4">

          {/* Token selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Token</label>
            <div className="flex gap-2">
              {SUPPORTED_TOKENS.map((t) => (
                <button
                  key={t.mint}
                  onClick={() => setMint(t.mint)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    mint === t.mint
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Private balance: <span className="text-gray-400">{privateBalance.toFixed(2)} {token.symbol}</span>
            </p>
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Recipient Address</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Solana wallet address"
              className="input-ghost w-full rounded-xl px-4 py-3 text-sm font-mono"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-ghost w-full rounded-xl px-4 py-3 text-sm pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-gray-500">{token.symbol}</span>
                <button
                  onClick={() => setAmount(privateBalance.toFixed(token.decimals))}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || !recipient || !amount || !publicKey}
            className="w-full btn-primary py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating ZK proof…
              </>
            ) : (
              <>
                <Lock size={15} />
                Send Privately
              </>
            )}
          </button>
        </div>

        {/* Success */}
        {txSig && (
          <div className="rounded-2xl p-4 bg-green-500/10 border border-green-500/20 space-y-2">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">✓</div>
              Sent privately
            </div>
            <a
              href={`https://solscan.io/tx/${txSig}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              View on Solscan <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* How it works */}
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">How it works</p>
          <div className="space-y-2">
            {[
              "Tokens enter the mixer as a UTXO commitment",
              "A Groth16 ZK proof is generated in your browser",
              "Recipient claims with zero on-chain link to you",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-gray-500">
                <span className="w-4 h-4 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
