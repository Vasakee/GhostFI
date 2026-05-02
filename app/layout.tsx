import type { Metadata } from "next";
import "./globals.css";
import { WalletProviderWrapper } from "@/components/WalletProvider";
import Script from "next/script";
import { Polyfills } from "@/components/Polyfills";

export const metadata: Metadata = {
  title: "GhostFi — Private Banking on Solana",
  description: "Your balance. Invisible. Private banking on Solana.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Polyfills />
        <Script src="https://cdn.jsdelivr.net/npm/snarkjs@0.7.6/build/snarkjs.min.js" strategy="beforeInteractive" />
        {/* Ambient background orbs */}
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />
        <div className="relative z-10">
          <WalletProviderWrapper>{children}</WalletProviderWrapper>
        </div>
      </body>
    </html>
  );
}
