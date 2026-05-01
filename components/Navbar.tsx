"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, Send, Download, ScrollText, ShieldCheck, MessageCircle, Smartphone } from "lucide-react";
import { useBankStore } from "@/lib/store";
import { GhostLogo } from "@/components/GhostLogo";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/send", label: "Send", icon: Send },
  { href: "/receive", label: "Receive", icon: Download },
  { href: "/card", label: "Card", icon: CreditCard },
];

const WHATSAPP_LINK = "https://wa.me/14155238886"; // Default Twilio Sandbox or user bot number

function WhatsAppIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M12.011 0C5.393 0 .012 5.382.012 12c0 2.112.633 4.17 1.83 5.92L0 24l6.235-1.635c1.7.932 3.618 1.423 5.776 1.423 6.618 0 12-5.382 12-12s-5.382-12-12-12zm.012 21.968c-1.9 0-3.76-.51-5.334-1.472l-.382-.234-3.968 1.04.59-3.868-.256-.408a9.923 9.923 0 0 1-1.52-5.41c0-5.503 4.477-9.97 9.97-9.97 5.505 0 9.97 4.478 9.97 9.97s-4.477 9.97-9.97 9.97zm5.466-7.464c-.3-.15-1.77-.874-2.04-.972-.273-.1-.47-.15-.67.15-.198.297-.768.97-.942 1.168-.173.198-.348.223-.648.074-.3-.15-1.265-.465-2.41-1.352-.89-.794-1.492-1.775-1.666-2.073-.174-.297-.02-.457.128-.605.133-.133.298-.347.447-.52s.2-.298.298-.497c.1-.197.05-.37-.024-.52-.075-.148-.67-1.61-.918-2.205-.242-.58-.487-.5-.67-.51-.173-.007-.372-.01-.57-.01-.2 0-.523.075-.795.373-.273.297-1.04 1.016-1.04 2.478 0 1.463 1.066 2.877 1.213 3.075.148.2 2.1 3.2 5.084 4.488.71.306 1.262.49 1.694.626.712.226 1.36.194 1.872.118.57-.085 1.774-.474 2.022-1.26.248-.788.248-1.465.174-1.614-.074-.15-.272-.236-.57-.385z" 
        fill="currentColor"
      />
    </svg>
  );
}

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
                <span>{n.label}</span>
                {n.href === "/card" && cardStatus !== "not_issued" && (
                  <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                    ${cardBalance.toFixed(2)}
                  </span>
                )}
              </Link>
            ))}
            
            {/* WhatsApp Icon Link */}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-green-500 hover:bg-white/5 transition-all duration-200"
            >
              <WhatsAppIcon size={18} />
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
          </div>

          {/* Wallet button */}
          <div className="flex items-center gap-3">
            <Link href="/transactions" className="text-gray-400 hover:text-white transition-colors p-2" title="Transactions">
              <ScrollText size={20} />
            </Link>
            {mounted && <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-violet-600 !rounded-lg !text-xs md:!text-sm !py-2 !px-3 md:!px-4 !font-medium hover:!shadow-lg hover:!shadow-purple-500/25 !transition-all" />}
          </div>
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
          
          {/* Mobile WhatsApp Link */}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-green-500 transition-all duration-200"
          >
            <WhatsAppIcon size={18} />
            <span className="text-[10px] font-medium">WhatsApp</span>
          </a>
        </div>
      </nav>

      {/* Bottom padding so content isn't hidden behind mobile nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
