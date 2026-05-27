import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "GhostFi Waitlist — Private Banking on Solana",
  description: "Join the waitlist for GhostFi — the privacy-first neobank on Solana. Shielded balances, virtual cards, WhatsApp and USSD banking.",
  openGraph: {
    title: "GhostFi — Private Banking is Coming.",
    description: "Your balance. Invisible. Join the waitlist.",
    url: "https://ghostfi.live/waitlist",
    siteName: "GhostFi",
    images: [{ url: "https://ghostfi.live/og-waitlist.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GhostFi — Private Banking is Coming.",
    description: "Your balance. Invisible. Join the waitlist.",
    site: "@GhostFi_xyz",
    images: ["https://ghostfi.live/og-waitlist.png"],
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
