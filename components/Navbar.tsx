"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, Send, Download, ScrollText, ShieldCheck } from "lucide-react";
import { useBankStore } from "@/lib/store";
import { GhostLogo } from "@/components/GhostLogo";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/send", label: "Send", icon: Send },
  { href: "/receive", label: "Receive", icon: Download },
  { href: "/transactions", label: "Txns", icon: ScrollText },
  { href: "/compliance", label: "Comply", icon: ShieldCheck },
  { href: "/card", label: "Card", icon: CreditCard },
];

export function Navbar() {
  const path = usePathname();
  const { cardBalance, cardStatus } = useBankStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {/* Top bar */}
      <nav className="sticky top-0 z-50 nav-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3.5">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <GhostLogo size={28} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${path === n.href
                    ? "bg-purple-500/15 text-white border border-purple-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {n.label === "Card" && <CreditCard size={13} />}
                <span>{n.label === "Txns" ? "Transactions" : n.label}</span>
                {n.href === "/card" && cardStatus !== "not_issued" && (
                  <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                    ${cardBalance.toFixed(2)}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Wallet button */}
          {mounted && <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-violet-600 !rounded-lg !text-xs md:!text-sm !py-2 !px-3 md:!px-4 !font-medium hover:!shadow-lg hover:!shadow-purple-500/25 !transition-all" />}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 nav-blur border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200
                  ${active ? "text-purple-400" : "text-gray-500"}`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding so content isn't hidden behind mobile nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
