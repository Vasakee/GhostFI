"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { getClient } from "@/lib/umbra";
import { exportMasterViewingKey } from "@/lib/actions";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

export default function CompliancePage() {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const [viewingKey, setViewingKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleExportKey() {
    setLoading(true);
    try {
      if (!publicKey || !signTransaction || !signMessage) throw new Error("Wallet not connected");
      const client = await getClient(publicKey.toBase58(), signTransaction as any, signMessage as any);
      const key = await exportMasterViewingKey(client);
      setViewingKey(key);
    } catch (e: any) { setErrorMsg(formatError(e)); }
    setLoading(false);
  }

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Compliance</h1>
        <p className="text-gray-400 text-sm">
          Export your viewing key to selectively disclose transaction history to auditors or regulators.
        </p>

        <div className="bg-gray-900 rounded-xl p-5 space-y-4">
          <p className="font-semibold text-sm">Master Viewing Key</p>
          <button
            onClick={handleExportKey}
            disabled={loading || !publicKey}
            className="w-full bg-brand hover:bg-brand-dark py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Deriving key..." : "Export Viewing Key"}
          </button>
          {viewingKey && (
            <div className="space-y-2">
              <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs break-all text-gray-300">
                0x{viewingKey}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`0x${viewingKey}`)}
                className="text-xs text-brand hover:underline"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-xs text-yellow-400">
          <p className="font-semibold">⚠️ Handle with care</p>
          <p>Anyone with your viewing key can read your private transaction history. Share only with trusted parties such as auditors or tax authorities.</p>
        </div>
      </main>
    </>
  );
}
