"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { getClient, SUPPORTED_TOKENS } from "@/lib/umbra";
import { scanUtxos, claimUtxos } from "@/lib/actions";
import { useBankStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

export default function ReceivePage() {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const { pendingUtxos, setPendingUtxos, addTx } = useBankStore();
  const [scanning, setScanning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function getClient_() {
    if (!publicKey || !signTransaction || !signMessage) throw new Error("Wallet not connected");
    return getClient(publicKey.toBase58(), signTransaction as any, signMessage as any);
  }

  async function handleScan() {
    setScanning(true);
    try {
      const client = await getClient_();
      const utxos = await scanUtxos(client);
      setPendingUtxos(utxos);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setScanning(false);
  }

  async function handleClaim() {
    if (!pendingUtxos.length) return;
    setClaiming(true);
    try {
      const client = await getClient_();
      await claimUtxos(client, pendingUtxos);
      pendingUtxos.forEach((u) => {
        const token = SUPPORTED_TOKENS.find((t) => t.mint === u.mint) ?? SUPPORTED_TOKENS[0];
        addTx({ type: "Receive", amount: BigInt(u.amount ?? 0), mint: token.symbol, sig: u.commitment ?? "", ts: Date.now() });
      });
      setPendingUtxos([]);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setClaiming(false);
  }

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Receive</h1>

        <div className="bg-gray-900 rounded-xl p-5 space-y-2">
          <p className="text-xs text-gray-400">Your Solana Address</p>
          <p className="font-mono text-sm break-all text-gray-200">{publicKey?.toBase58() ?? "—"}</p>
          <p className="text-xs text-gray-500">Share this address to receive private transfers via the Umbra mixer.</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Pending UTXOs</p>
            <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full">{pendingUtxos.length}</span>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || !publicKey}
            className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan for Incoming Transfers"}
          </button>

          {pendingUtxos.length > 0 && (
            <>
              <div className="space-y-2">
                {pendingUtxos.map((u, i) => (
                  <div key={i} className="flex justify-between text-sm bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-gray-300">UTXO #{i + 1}</span>
                    <span>{(Number(u.amount ?? 0) / 1e6).toFixed(2)} USDC</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-brand hover:bg-brand-dark py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {claiming ? "Claiming..." : `Claim ${pendingUtxos.length} UTXO(s) into Private Balance`}
              </button>
            </>
          )}
        </div>
      </main>
    </>
  );
}
