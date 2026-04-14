"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getClient, SUPPORTED_TOKENS } from "@/lib/umbra";
import { registerAccount, shieldTokens, unshieldTokens, fetchEncryptedBalances } from "@/lib/actions";
import { useBankStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { ErrorModal } from "@/components/ErrorModal";
import { formatError } from "@/lib/errors";

export default function Dashboard() {
  const { connected, publicKey, signTransaction, signMessage } = useWallet();
  const { registered, shieldedBalances, txHistory, setRegistered, setShieldedBalance, addTx } =
    useBankStore();
  const [loading, setLoading] = useState("");
  const [shieldAmt, setShieldAmt] = useState("");
  const [unshieldAmt, setUnshieldAmt] = useState("");
  const [selectedMint, setSelectedMint] = useState(SUPPORTED_TOKENS[0].mint);
  const [errorMsg, setErrorMsg] = useState("");
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [publicTokenBalances, setPublicTokenBalances] = useState<Record<string, number>>({});

  const token = SUPPORTED_TOKENS.find((t) => t.mint === selectedMint)!;
  const network = process.env.NEXT_PUBLIC_NETWORK ?? "mainnet";

  async function fetchPublicBalances(address: string) {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL!;

    const [solRes, tokenRes, token2022Res] = await Promise.all([
      fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
      }).then((r) => r.json()),
      fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "getTokenAccountsByOwner",
          params: [address, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }],
        }),
      }).then((r) => r.json()),
      fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 3, method: "getTokenAccountsByOwner",
          params: [address, { programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }, { encoding: "jsonParsed" }],
        }),
      }).then((r) => r.json()),
    ]);

    if (solRes.result?.value != null) {
      setSolBalance(solRes.result.value / 1e9);
    }

    const balances: Record<string, number> = {};
    for (const { account } of [...(tokenRes.result?.value ?? []), ...(token2022Res.result?.value ?? [])]) {
      const info = account.data.parsed.info;
      balances[info.mint] = (info.tokenAmount.uiAmount ?? 0);
    }
    setPublicTokenBalances(balances);
  }

  // Fetch SOL + token balances on connect
  useEffect(() => {
    if (!publicKey) return;
    fetchPublicBalances(publicKey.toBase58()).catch(console.error);
  }, [publicKey?.toBase58()]);
  useEffect(() => {
    if (!publicKey || !signTransaction || !signMessage) return;
    const address = publicKey.toBase58();
    getClient(address, signTransaction as any, signMessage as any)
      .then((client) => fetchEncryptedBalances(client, SUPPORTED_TOKENS.map((t) => t.mint)))
      .then((balances) => {
        for (const [mint, amount] of balances.entries()) {
          setShieldedBalance(mint, amount);
        }
      })
      .catch(() => {});
  }, [publicKey?.toBase58()]);

  async function refreshBalances() {
    if (!publicKey || !signTransaction || !signMessage) return;
    try {
      const address = publicKey.toBase58();
      const client = await getClient(address, signTransaction as any, signMessage as any);
      const balances = await fetchEncryptedBalances(client, SUPPORTED_TOKENS.map((t) => t.mint));
      for (const [mint, amount] of balances.entries()) {
        setShieldedBalance(mint, amount);
      }
      await fetchPublicBalances(address);
    } catch (_) {}
  }

  async function handleAirdrop() {
    setLoading("Airdropping...");
    try {
      const rpc = process.env.NEXT_PUBLIC_RPC_URL!;
      const address = publicKey!.toBase58();
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "requestAirdrop",
          params: [address, 2_000_000_000], // 2 SOL
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      await fetchPublicBalances(address);
    } catch (e: any) {
      setErrorMsg(formatError(e));
    }
    setLoading("");
  };

  async function getUmbraClient() {
    if (!publicKey || !signTransaction || !signMessage) throw new Error("Wallet not connected");
    return getClient(publicKey.toBase58(), signTransaction as any, signMessage as any);
  }

  async function handleRegister() {
    setLoading("Registering...");
    try {
      const client = await getUmbraClient();
      await registerAccount(client);
      setRegistered(true);
    } catch (e: any) {
      setErrorMsg(formatError(e));
    }
    setLoading("");
  }

  async function handleShield() {
    setLoading("Shielding...");
    try {
      const client = await getUmbraClient();
      const amount = BigInt(Math.round(parseFloat(shieldAmt) * 10 ** token.decimals));
      const result = await shieldTokens(client, selectedMint, amount);
      addTx({ type: "Shield", amount, mint: token.symbol, sig: result.queueSignature, ts: Date.now() });
      await refreshBalances();
      setShieldAmt("");
    } catch (e: any) {
      setErrorMsg(formatError(e));
    }
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
    } catch (e: any) {
      setErrorMsg(formatError(e));
    }
    setLoading("");
  }

  if (!connected) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[80vh] text-gray-400">
          Connect your wallet to continue
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      {errorMsg && <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />}
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl p-6 space-y-1">
          <p className="text-sm text-purple-200">Private Balance</p>
          <p className="text-4xl font-bold">
            {(Number(shieldedBalances[selectedMint] ?? 0n) / 10 ** token.decimals).toFixed(2)}{" "}
            {token.symbol}
          </p>
          <p className="text-xs text-purple-300">🔒 Encrypted on-chain — only you can see this</p>
        </div>

        {/* Token selector */}
        <div className="flex gap-2">
          {SUPPORTED_TOKENS.map((t) => (
            <button
              key={t.mint}
              onClick={() => setSelectedMint(t.mint)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedMint === t.mint ? "bg-brand text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              {t.symbol}
            </button>
          ))}
        </div>

        {/* SOL balance + devnet airdrop */}
        <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">SOL Balance ({network})</p>
            <p className="text-sm font-semibold">{solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "—"}</p>
          </div>
          {solBalance !== null && solBalance < 0.5 && network === "devnet" && (
            <button
              onClick={handleAirdrop}
              disabled={!!loading}
              className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {loading === "Airdropping..." ? "Airdropping..." : "Airdrop 2 SOL"}
            </button>
          )}
        </div>

        {/* Public token balances */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-2">
          <p className="text-xs text-gray-400">Public Wallet Balances</p>
          {SUPPORTED_TOKENS.map((t) => (
            <div key={t.mint} className="flex justify-between text-sm">
              <span className="text-gray-300">{t.symbol}</span>
              <span className="font-semibold">{(publicTokenBalances[t.mint] ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Register */}
        {!registered && (
          <div className="bg-gray-900 rounded-xl p-5 space-y-3">
            <p className="text-sm text-gray-300">
              First time? Register your Umbra account to enable private balances.
            </p>
            <button
              onClick={handleRegister}
              disabled={!!loading || !publicKey}
              className="bg-brand hover:bg-brand-dark px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading || "Register Account"}
            </button>
          </div>
        )}

        {/* Shield / Unshield */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-xl p-5 space-y-3">
            <p className="font-semibold text-sm">Shield Tokens</p>
            <p className="text-xs text-gray-400">Move tokens into your private balance</p>
            <input
              type="number"
              placeholder="Amount"
              value={shieldAmt}
              onChange={(e) => setShieldAmt(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={handleShield}
              disabled={!!loading || !shieldAmt || !publicKey}
              className="w-full bg-brand hover:bg-brand-dark py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading === "Shielding..." ? "Shielding..." : "Shield →"}
            </button>
          </div>

          <div className="bg-gray-900 rounded-xl p-5 space-y-3">
            <p className="font-semibold text-sm">Unshield Tokens</p>
            <p className="text-xs text-gray-400">Move tokens back to your public wallet</p>
            <input
              type="number"
              placeholder="Amount"
              value={unshieldAmt}
              onChange={(e) => setUnshieldAmt(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={handleUnshield}
              disabled={!!loading || !unshieldAmt || !publicKey}
              className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading === "Unshielding..." ? "Unshielding..." : "← Unshield"}
            </button>
          </div>
        </div>

        {/* Tx History */}
        {txHistory.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 space-y-3">
            <p className="font-semibold text-sm">Recent Activity</p>
            {txHistory.map((tx, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-gray-800 pb-2">
                <span className="text-gray-300">{tx.type}</span>
                <span>{(Number(tx.amount) / 1e6).toFixed(2)} {tx.mint}</span>
                <a
                  href={`https://solscan.io/tx/${tx.sig}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand text-xs"
                >
                  View ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
