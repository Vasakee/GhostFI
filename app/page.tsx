"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { GhostAnimation } from "@/components/GhostAnimation";
import { GhostLogo } from "@/components/GhostLogo";

import { isVisible } from "@/lib/config";

const FEATURES = [
  isVisible("ENABLE_BANK_PAYOUTS") && { icon: "🌍", title: "Global Bank Payouts", desc: "Instantly withdraw your private balance to bank accounts and cards via our fintech partners." },
  { icon: "🛡️", title: "Umbra ZK-Privacy", desc: "Confidential transactions powered by the Umbra SDK using stealth addresses and Groth16 ZK-proofs." },
  { icon: "💵", title: "Multi-Asset Support", desc: "Native privacy and utility for USDT, USDC, USDG, and other major stablecoins." },
  isVisible("ENABLE_VIRTUAL_CARDS") && { icon: "💳", title: "Global Virtual Cards", desc: "Issue secure USD cards to spend your shielded balance at any merchant worldwide." },
  { icon: "📈", title: "Live Market Intelligence", desc: "Real-time pricing data and liquidity insights directly integrated into your banking chat." },
  isVisible("ENABLE_DUNE_ANALYTICS") && { icon: "📊", title: "Protocol Transparency", desc: "Verifiable health and privacy metrics to ensure ecosystem integrity." },
  isVisible("ENABLE_USSD") && { icon: "📱", title: "Universal Inclusion", desc: "No internet needed. Bank via simple USSD codes on any mobile phone." },
  isVisible("ENABLE_WHATSAPP") && { icon: "💬", title: "WhatsApp Banking", desc: "Chat with GhostFi on WhatsApp to send money, check balance, and manage your private vault." },
].filter(Boolean) as any[];

const STATS = [
  { label: "Privacy", value: "Umbra" },
  { label: "Network", value: "Solana" },
  { label: "Region", value: "Global" },
];

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (connected) router.push("/dashboard");
  }, [connected, router]);

  return (
    <main className="min-h-screen px-4 sm:px-8 pt-8 sm:pt-12 pb-24 md:pb-20 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col gap-12 sm:gap-16 relative z-10">

        {/* ── Hero: stacked on mobile, two-col centered on large ── */}
        <section className="flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-10 lg:gap-16">

          {/* Left — text + CTA */}
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">

            <div className="animate-fade-in-up-1 inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-purple-500/20 text-xs sm:text-sm text-purple-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live on Solana Mainnet
            </div>

            <div className="animate-fade-in-up-2">
              <GhostLogo size={48} />
              <div className="mt-3 h-px w-32 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto" />
            </div>

            <p className="animate-fade-in-up-3 text-gray-400 text-base sm:text-lg md:text-xl font-light leading-relaxed px-4">
              Your balance.{" "}
              <span className="gradient-text font-medium">Invisible.</span>
              <br />
              Private banking on Solana.
            </p>

            <div className="animate-fade-in-up-4 flex flex-col items-center gap-3 w-full">
              <div className="pulse-glow rounded-xl">
                {mounted && <WalletMultiButton className="!btn-primary !rounded-xl !py-3 sm:!py-3.5 !px-8 sm:!px-10 !text-sm sm:!text-base !font-semibold" />}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">No KYC. No data collection. Just privacy.</p>
            </div>

            {/* Stats */}
            <div
              className="animate-fade-in-up glass rounded-2xl border border-white/5 overflow-hidden flex w-full max-w-sm"
              style={{ animationDelay: "0.7s", animationFillMode: "both" }}
            >
              {STATS.map((s, i) => (
                <div key={s.label} className="flex-1 flex flex-col items-center py-3 sm:py-4 px-2 relative">
                  {i > 0 && <div className="absolute left-0 top-1/4 h-1/2 w-px bg-white/5" />}
                  <p className="text-white font-bold text-sm sm:text-base">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — ghost */}
          <div className="flex-shrink-0 animate-fade-in-up-2 hidden sm:block">
            <GhostAnimation />
          </div>
        </section>

        {/* ── Feature cards ── */}
        <section>
          <p
            className="text-center text-xs sm:text-sm uppercase tracking-widest text-gray-600 mb-4 sm:mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.8s", animationFillMode: "both" }}
          >
            Everything private, by default
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass glass-hover rounded-2xl p-4 sm:p-5 flex flex-col gap-2 animate-fade-in-up"
                style={{ animationDelay: `${0.9 + i * 0.1}s`, animationFillMode: "both" }}
              >
                <div className="text-2xl sm:text-xl">{f.icon}</div>
                <p className="text-sm sm:text-xs font-semibold text-white">{f.title}</p>
                <p className="text-xs sm:text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
