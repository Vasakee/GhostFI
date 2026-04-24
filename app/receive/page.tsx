"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { Download, Copy, Check, Radar } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const address = publicKey?.toBase58() ?? "";

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

  function copyAddress() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download size={20} className="text-purple-400" /> Receive
          </h1>
          <p className="text-gray-500 text-sm">Scan for incoming private transfers and claim them.</p>
        </div>

        {/* Address card */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Your Receive Address</p>
          <div className="bg-white/3 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-gray-300 break-all leading-relaxed">
              {address || "Connect wallet"}
            </p>
            {address && (
              <button
                onClick={copyAddress}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600">Share this address to receive private transfers via the GhostFi mixer.</p>
        </div>

        {/* Scan card */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Pending UTXOs</p>
              <p className="text-xs text-gray-500 mt-0.5">Unclaimed incoming transfers</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              pendingUtxos.length > 0
                ? "bg-purple-500/20 text-purple-300"
                : "bg-white/5 text-gray-500"
            }`}>
              {pendingUtxos.length}
            </span>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning || !publicKey}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-purple-500/30 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
          >
            {scanning ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Radar size={15} className="text-purple-400" />
                Scan for Incoming Transfers
              </>
            )}
          </button>

          {pendingUtxos.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                {pendingUtxos.map((u, i) => {
                  const token = SUPPORTED_TOKENS.find((t) => t.mint === u.mint) ?? SUPPORTED_TOKENS[0];
                  return (
                    <div key={i} className="flex items-center justify-between bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center">
                          <Download size={12} className="text-green-400" />
                        </div>
                        <span className="text-sm text-gray-300">UTXO #{i + 1}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-400">
                        +{(Number(u.amount ?? 0) / 10 ** token.decimals).toFixed(2)} {token.symbol}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full btn-primary py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming…
                  </>
                ) : (
                  `Claim ${pendingUtxos.length} UTXO${pendingUtxos.length > 1 ? "s" : ""} into Private Balance`
                )}
              </button>
            </div>
          )}

          {!scanning && pendingUtxos.length === 0 && publicKey && (
            <p className="text-center text-xs text-gray-600 py-2">No pending transfers found. Scan to check for new ones.</p>
          )}
        </div>
      </main>
    </>
  );
}
