"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { GhostAnimation } from "@/components/GhostAnimation";
import { GhostLogo } from "@/components/GhostLogo";

const FEATURES = [
  { icon: "🔒", title: "Private Balances", desc: "Encrypted on-chain via Arcium MPC. Only you can see your balance." },
  { icon: "🕵️", title: "Anonymous Transfers", desc: "UTXO mixer with Groth16 ZK proofs. No link between sender and recipient." },
  { icon: "💳", title: "Virtual Card", desc: "Spend your private balance anywhere Visa is accepted." },
  { icon: "📋", title: "Compliance Keys", desc: "Selective disclosure to auditors — on your terms, not theirs." },
];

const STATS = [
  { label: "ZK Proofs", value: "Groth16" },
  { label: "Privacy Layer", value: "Arcium MPC" },
  { label: "Network", value: "Solana" },
];

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) router.push("/dashboard");
  }, [connected, router]);

  return (
    <main className="min-h-screen px-4 sm:px-8 pt-12 pb-20 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col gap-16 relative z-10">

        {/* ── Hero: stacked on mobile, two-col centered on large ── */}
        <section className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">

          {/* Left — text + CTA */}
          <div className="flex flex-col items-center text-center gap-5">

            <div className="animate-fade-in-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-purple-500/20 text-xs text-purple-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live on Solana Mainnet
            </div>

            <div className="animate-fade-in-up-2">
              <GhostLogo size={48} />
              <div className="mt-3 h-px w-32 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto" />
            </div>

            <p className="animate-fade-in-up-3 text-gray-400 text-lg md:text-xl font-light leading-relaxed">
              Your balance.{" "}
              <span className="gradient-text-cyan font-medium">Invisible.</span>
              <br />
              Private banking on Solana.
            </p>

            <div className="animate-fade-in-up-4 flex flex-col items-center gap-3">
              <div className="pulse-glow rounded-xl">
                <WalletMultiButton className="!btn-primary !rounded-xl !py-3.5 !px-10 !text-base !font-semibold" />
              </div>
              <p className="text-xs text-gray-600">No KYC. No data collection. Just privacy.</p>
            </div>

            {/* Stats */}
            <div
              className="animate-fade-in-up glass rounded-2xl border border-white/5 overflow-hidden flex w-full max-w-sm"
              style={{ animationDelay: "0.7s", animationFillMode: "both" }}
            >
              {STATS.map((s, i) => (
                <div key={s.label} className="flex-1 flex flex-col items-center py-4 px-2 relative">
                  {i > 0 && <div className="absolute left-0 top-1/4 h-1/2 w-px bg-white/5" />}
                  <p className="text-white font-bold text-sm">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — ghost */}
          <div className="flex-shrink-0 animate-fade-in-up-2">
            <GhostAnimation />
          </div>
        </section>

        {/* ── Feature cards ── */}
        <section>
          <p
            className="text-center text-xs uppercase tracking-widest text-gray-600 mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.8s", animationFillMode: "both" }}
          >
            Everything private, by default
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass glass-hover rounded-2xl p-4 flex flex-col gap-2 animate-fade-in-up"
                style={{ animationDelay: `${0.9 + i * 0.1}s`, animationFillMode: "both" }}
              >
                <div className="text-xl">{f.icon}</div>
                <p className="text-xs font-semibold text-white">{f.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
