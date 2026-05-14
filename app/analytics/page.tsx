"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BarChart, Activity, Shield, Users, Globe, ExternalLink, RefreshCw } from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState({
    tvl: 0,
    transfers: 0,
    wallets: 0,
    payouts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const metrics = [
    { label: "Total Volume (TVL)", value: `$${data.tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: "LIVE", icon: Activity },
    { label: "Private Transfers", value: data.transfers.toLocaleString(), change: "LIVE", icon: Shield },
    { label: "Active Ghost Wallets", value: data.wallets.toLocaleString(), change: "LIVE", icon: Users },
    { label: "Global Payout Volume", value: `$${data.payouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: "LIVE", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20 pb-28 md:pb-20">
        <div className="mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <BarChart className="text-purple-400" size={28} /> GhostFi Analytics
            </h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl">
              Real-time protocol metrics. We track aggregate system health without ever seeing individual user identities.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] sm:text-xs text-purple-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {loading ? "FETCHING..." : "REAL-TIME DATA"}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {metrics.map((m, i) => (
            <div key={i} className="p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all group">
              <div className="flex justify-between items-start mb-2 sm:mb-4">
                <m.icon className="text-gray-400 group-hover:text-purple-400 transition-colors" size={18} />
                <span className="text-purple-400 text-[9px] font-bold tracking-widest uppercase">{m.change}</span>
              </div>
              <p className="text-gray-400 text-[11px] sm:text-sm mb-1">{m.label}</p>
              <h3 className="text-base sm:text-2xl font-bold font-mono">
                {loading ? <RefreshCw className="animate-spin text-gray-700" size={16} /> : m.value}
              </h3>
              <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-white/5 text-[10px] text-gray-500 font-mono">
                REGION: GLOBAL
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1 p-5 sm:p-8 rounded-3xl bg-white/5 border border-white/10">
            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
              <Shield className="text-purple-400" size={20} /> How we track without "Tracking"
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs sm:text-sm text-gray-400 leading-relaxed">
              <div className="space-y-4">
                <p>
                  <strong className="text-white block mb-1">1. Shielding Entrance Volume</strong>
                  When assets move from a public wallet into GhostFi, the "Shield" transaction is public on Solana. We track the total value entering the pool to calculate TVL.
                </p>
                <p>
                  <strong className="text-white block mb-1">2. Zero-Knowledge Proof Counts</strong>
                  Every private transfer requires a ZK-proof to be verified on-chain. We count these successful verifications to report "Total Private Transfers" without knowing who the sender or recipient is.
                </p>
              </div>
              <div className="space-y-4">
                <p>
                  <strong className="text-white block mb-1">3. Commitment Tree Growth</strong>
                  The protocol maintains an encrypted commitment tree. By monitoring the addition of new nodes, we can verify system-wide activity while maintaining individual anonymity.
                </p>
                <p>
                  <strong className="text-white block mb-1">4. Prototype Mode</strong>
                  For this alpha, metrics are aggregated directly from the GhostFi database to provide instantaneous feedback during your testing session.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-center items-center text-center order-1 lg:order-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <ExternalLink className="text-purple-400" size={28} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Ecosystem Health</h2>
            <p className="text-gray-400 text-sm mb-6 sm:mb-8 max-w-sm">
              Verify the underlying Umbra Protocol metrics on Dune Analytics to see the total Solana privacy volume.
            </p>
            <a 
              href="https://dune.com/umbra_privacy/umbra-protocol-on-solana" 
              target="_blank" 
              className="px-6 sm:px-8 py-3 bg-purple-500 text-white font-bold rounded-full hover:bg-purple-400 transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              Open Dune Dashboard
            </a>
          </div>
        </div>
        
        <div className="mt-10 sm:mt-20 p-6 sm:p-12 rounded-3xl sm:rounded-[3rem] bg-gradient-to-br from-purple-500/10 to-transparent border border-white/10">
           <div className="max-w-3xl">
              <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6">Transparency for the Untraceable</h2>
              <p className="text-gray-400 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                GhostFi combines the power of Umbra's stealth addresses with verifiable ecosystem health metrics. While individual transactions remain private, the overall health of the protocol is public.
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                 <div className="px-3 sm:px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">#CloakTrack</div>
                 <div className="px-3 sm:px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">#DuneTrack</div>
                 <div className="px-3 sm:px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">#SolanaFrontier</div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
