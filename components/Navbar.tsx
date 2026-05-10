"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, Send, Download, ScrollText, BarChart } from "lucide-react";
import { useBankStore } from "@/lib/store";
import { GhostLogo } from "@/components/GhostLogo";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

import { isVisible } from "@/lib/config";

const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/send", label: "Send", icon: Send },
  { href: "/receive", label: "Receive", icon: Download },
  isVisible("ENABLE_VIRTUAL_CARDS") && { href: "/card", label: "Card", icon: CreditCard },
  isVisible("ENABLE_DUNE_ANALYTICS") && { href: "/analytics", label: "Analytics", icon: BarChart },
].filter(Boolean) as any[];

const WHATSAPP_LINK = "https://wa.me/2347034942522";

export function Navbar() {
  const path = usePathname();
  const { cardBalance, cardStatus } = useBankStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {/* Top bar */}
      <nav className="sticky top-0 z-50 nav-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">

          <Link href="/dashboard" className="flex items-center gap-2 group">
            <GhostLogo size={28} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200
                  ${path === n.href
                    ? "bg-purple-500/15 text-white border border-purple-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {n.label === "Card" && <CreditCard size={13} className="text-purple-400" />}
                {n.label === "Analytics" && <BarChart size={13} className="text-purple-400" />}
                <span>{n.label}</span>
                {n.href === "/card" && cardStatus !== "not_issued" && (
                  <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                    ${cardBalance.toFixed(2)}
                  </span>
                )}
              </Link>
            ))}
            
            {/* USDT Badge */}
            <div className="ml-1 lg:ml-2 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-bold uppercase tracking-wider hidden lg:block">
              USDT Live
            </div>
            
            {/* WhatsApp Icon Link */}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium text-gray-400 hover:text-green-500 hover:bg-white/5 transition-all duration-200"
            >
              <WhatsAppIcon size={18} />
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
          </div>

          {/* Wallet button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/transactions" className="hidden md:block text-gray-400 hover:text-white transition-colors p-2" title="Transactions">
              <ScrollText size={20} />
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden text-gray-400 hover:text-green-500 transition-colors p-2"
            >
              <WhatsAppIcon size={20} />
            </a>
            {mounted && <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-violet-600 !rounded-lg !text-xs md:!text-sm !py-2 !px-3 md:!px-4 !font-medium hover:!shadow-lg hover:!shadow-purple-500/25 !transition-all" />}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 nav-blur border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-2.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-[60px]
                  ${active ? "text-purple-400" : "text-gray-500"}`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{n.label}</span>
              </Link>
            );
          })}

          {/* Transactions */}
          <Link
            href="/transactions"
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-[60px]
              ${path === "/transactions" ? "text-purple-400" : "text-gray-500"}`}
          >
            <ScrollText size={20} />
            <span className="text-[10px] font-medium">History</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
