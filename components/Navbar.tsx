"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { CreditCard } from "lucide-react";
import { useBankStore } from "@/lib/store";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send", label: "Send" },
  { href: "/receive", label: "Receive" },
  { href: "/compliance", label: "Compliance" },
];

export function Navbar() {
  const path = usePathname();
  const { cardBalance, cardStatus } = useBankStore();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <Link href="/dashboard" className="text-xl font-bold">
        <span className="text-brand">Umbra</span> Bank
      </Link>
      <div className="flex gap-6 text-sm items-center">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={path === n.href ? "text-white font-semibold" : "text-gray-400 hover:text-white"}>
            {n.label}
          </Link>
        ))}
        <Link href="/card"
          className={`flex items-center gap-1.5 ${path === "/card" ? "text-white font-semibold" : "text-gray-400 hover:text-white"}`}>
          <CreditCard size={14} />
          <span>Card</span>
          {cardStatus !== "not_issued" && (
            <span className="text-xs text-gray-500">${cardBalance.toFixed(2)}</span>
          )}
        </Link>
      </div>
      <WalletMultiButton className="!bg-brand !rounded-lg !text-sm !py-2 !px-4" />
    </nav>
  );
}
