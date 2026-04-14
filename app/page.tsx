"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) router.push("/dashboard");
  }, [connected, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center space-y-3">
        <div className="text-5xl font-bold tracking-tight">
          <span className="text-brand">Umbra</span> Bank
        </div>
        <p className="text-gray-400 text-lg max-w-sm">
          Your balance. Your business. Private banking on Solana.
        </p>
      </div>
      <WalletMultiButton className="!bg-brand hover:!bg-brand-dark !rounded-xl !py-3 !px-8 !text-base" />
      <div className="grid grid-cols-3 gap-4 mt-8 text-center text-sm text-gray-500 max-w-lg">
        {["🔒 Private balances", "🕵️ Anonymous transfers", "📋 Compliance keys"].map((f) => (
          <div key={f} className="bg-gray-900 rounded-xl p-4">{f}</div>
        ))}
      </div>
    </main>
  );
}
