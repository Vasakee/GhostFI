"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { getClient, SUPPORTED_TOKENS } from "@/lib/umbra";
import { privateSend } from "@/lib/actions";
import { useBankStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

export default function SendPage() {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const { addTx } = useBankStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState(SUPPORTED_TOKENS[0].mint);
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const token = SUPPORTED_TOKENS.find((t) => t.mint === mint)!;

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
      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Private Send</h1>
        <p className="text-gray-400 text-sm">
          Send tokens via the Umbra mixer. The on-chain link between you and the recipient is completely broken.
        </p>

        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Token</label>
            <div className="flex gap-2">
              {SUPPORTED_TOKENS.map((t) => (
                <button
                  key={t.mint}
                  onClick={() => setMint(t.mint)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    mint === t.mint ? "bg-brand text-white" : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Recipient Solana Address</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient wallet address"
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Amount ({token.symbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !recipient || !amount || !publicKey}
            className="w-full bg-brand hover:bg-brand-dark py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? "Generating ZK proof..." : "Send Privately 🔒"}
          </button>
        </div>

        {txSig && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-sm space-y-1">
            <p className="text-green-400 font-semibold">✓ Sent privately</p>
            <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer" className="text-brand text-xs">
              View on Solscan ↗
            </a>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p>🔒 How it works:</p>
          <p>Tokens enter the Umbra mixer as a UTXO commitment. A Groth16 ZK proof is generated in your browser. The recipient claims with no on-chain link back to you.</p>
        </div>
      </main>
    </>
  );
}
