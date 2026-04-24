"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { ShieldCheck, Copy, Check, Eye, AlertTriangle } from "lucide-react";
import { getClient } from "@/lib/umbra";
import { exportMasterViewingKey } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

export default function CompliancePage() {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const [viewingKey, setViewingKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleExportKey() {
    setLoading(true);
    try {
      if (!publicKey || !signTransaction || !signMessage) throw new Error("Wallet not connected");
      const client = await getClient(publicKey.toBase58(), signTransaction as any, signMessage as any);
      const key = await exportMasterViewingKey(client);
      setViewingKey(key);
      setRevealed(false);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setLoading(false);
  }

  function copyKey() {
    navigator.clipboard.writeText(`0x${viewingKey}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const maskedKey = viewingKey ? "•".repeat(32) + viewingKey.slice(-8) : "";

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-purple-400" /> Compliance
          </h1>
          <p className="text-gray-500 text-sm">Export your viewing key for selective disclosure to auditors or regulators.</p>
        </div>

        {/* What is this */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">What is a Viewing Key?</p>
          <div className="space-y-2">
            {[
              "Read-only access to your private transaction history",
              "Cannot be used to move or spend any funds",
              "Share with auditors, accountants, or tax authorities",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Export card */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-sm">Master Viewing Key</p>

          <button
            onClick={handleExportKey}
            disabled={loading || !publicKey}
            className="w-full btn-primary py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deriving key…
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                {viewingKey ? "Re-export Viewing Key" : "Export Viewing Key"}
              </>
            )}
          </button>

          {viewingKey && (
            <div className="space-y-3">
              <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Viewing Key</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRevealed((r) => !r)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
                    >
                      <Eye size={12} />
                      {revealed ? "Hide" : "Reveal"}
                    </button>
                    <button
                      onClick={copyKey}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <p className="font-mono text-xs break-all text-gray-300 leading-relaxed select-all">
                  0x{revealed ? viewingKey : maskedKey}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="rounded-2xl p-4 bg-amber-500/8 border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertTriangle size={15} />
            Handle with care
          </div>
          <p className="text-xs text-amber-400/70 leading-relaxed">
            Anyone with your viewing key can read your full private transaction history. Share only with trusted parties. It cannot be used to move funds.
          </p>
        </div>
      </main>
    </>
  );
}
