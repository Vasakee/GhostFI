"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { GhostAnimation } from "@/components/GhostAnimation";

const FEATURES = [
  { icon: "🔒", title: "Private Balances", desc: "Encrypted on-chain via Arcium MPC. Only you can see your balance." },
  { icon: "🕵️", title: "Anonymous Transfers", desc: "UTXO mixer with Groth16 ZK proofs. No link between sender and recipient." },
  { icon: "💳", title: "Virtual Card", desc: "Spend your private balance anywhere Visa is accepted." },
  { icon: "📋", title: "Compliance Keys", desc: "Selective disclosure to auditors — on your terms, not theirs." },
];

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) router.push("/dashboard");
  }, [connected, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">

      {/* Background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full border border-purple-500/5 animate-spin-slow" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-purple-500/8 animate-spin-slow-reverse" />
      </div>

      {/* Hero */}
      <div className="text-center space-y-4 max-w-2xl relative z-10">

        {/* Badge */}
        <div className="animate-fade-in-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-purple-500/20 text-xs text-purple-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live on Solana Mainnet
        </div>

        {/* Ghost animation */}
        <div className="animate-fade-in-up-2">
          <GhostAnimation />
        </div>

        {/* Wordmark */}
        <div className="animate-fade-in-up-2 -mt-4">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-none">
            <span className="gradient-text">Ghost</span>
            <span className="text-white">Fi</span>
          </h1>
          <div className="mt-3 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>

        {/* Tagline */}
        <p className="animate-fade-in-up-3 text-gray-400 text-lg md:text-xl font-light leading-relaxed">
          Your balance.{" "}
          <span className="gradient-text-cyan font-medium">Invisible.</span>
          <br />
          Private banking on Solana.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up-4 flex flex-col items-center gap-3 pt-2">
          <div className="pulse-glow rounded-xl">
            <WalletMultiButton className="!btn-primary !rounded-xl !py-3.5 !px-10 !text-base !font-semibold" />
          </div>
          <p className="text-xs text-gray-600">No KYC. No data collection. Just privacy.</p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 max-w-3xl w-full relative z-10">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="glass glass-hover rounded-2xl p-5 space-y-2 animate-fade-in-up"
            style={{ animationDelay: `${0.6 + i * 0.1}s`, animationFillMode: "both" }}
          >
            <div className="text-2xl">{f.icon}</div>
            <p className="text-sm font-semibold text-white">{f.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Stat strip */}
      <div className="flex items-center gap-8 mt-12 text-center relative z-10 animate-fade-in-up" style={{ animationDelay: "1s", animationFillMode: "both" }}>
        {[
          { label: "ZK Proofs", value: "Groth16" },
          { label: "Privacy Layer", value: "Arcium MPC" },
          { label: "Network", value: "Solana" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-white font-bold text-sm">{s.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
