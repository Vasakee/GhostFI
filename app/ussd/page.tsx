import { Navbar } from "@/components/Navbar";
import { Smartphone, Shield, Wifi, CheckCircle } from "lucide-react";

const MENU_FLOW = [
  { step: "Dial shortcode", detail: "*384*GhostFi# (sandbox)", icon: "📞" },
  { step: "Main menu appears", detail: "6 options shown on screen", icon: "📋" },
  { step: "Press a number", detail: "Navigate with your keypad", icon: "🔢" },
  { step: "Confirm actions", detail: "Review before executing", icon: "✅" },
  { step: "Get result", detail: "Session ends with confirmation", icon: "👻" },
];

const NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

const MENU_ITEMS = [
  { key: "1", label: "Check Balance", desc: "View your encrypted USDC balance" },
  { key: "2", label: "Send Money", desc: "Private transfer to any phone number" },
  { key: "3", label: "Shield Funds", desc: "Move USDC to private balance" },
  { key: "4", label: "Unshield Funds", desc: "Move USDC to public wallet" },
  { key: "5", label: "My Virtual Card", desc: "View, freeze, or get card details via SMS" },
  { key: "6", label: "Transaction History", desc: "Last 3 transactions" },
  { key: "0", label: "Exit", desc: "End session" },
];

export default function UssdPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10 space-y-8 pb-28 md:pb-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-2">
            <Smartphone className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">GhostFi USSD</h1>
          <p className="text-gray-400">Private banking on any phone — no internet, no app required.</p>
        </div>

        {/* Dial CTA */}
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-8 text-center space-y-4">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium">Dial from any phone</p>
          <p className="text-3xl sm:text-5xl font-bold font-mono text-white tracking-wider">*384*GhostFi#</p>
          <p className="text-gray-400 text-sm">Africa's Talking sandbox shortcode</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {NETWORKS.map((n) => (
              <span key={n} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-medium">{n}</span>
            ))}
          </div>
          <a
            href="https://simulator.africastalking.com/ussd/simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Try the Web Simulator
          </a>
          <p className="text-xs text-gray-500">No real phone needed — Africa's Talking provides a browser simulator for testing</p>
        </div>

        {/* Custodial notice */}
        <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            <span className="font-semibold">Custodial wallet:</span> USSD uses a server-side wallet tied to your phone number, encrypted with AES-256. Funds are held in a GhostFi-managed keypair on Solana.
          </p>
        </div>

        {/* No internet badge */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <Wifi className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-sm text-green-300 font-medium">Works on any phone — no internet, no smartphone, no app required.</p>
        </div>

        {/* Menu structure */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Menu Options</h2>
          <div className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
            {MENU_ITEMS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-4 px-4 py-3 bg-white/2 hover:bg-white/5 transition-colors">
                <span className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/20 text-purple-300 text-sm font-bold flex items-center justify-center shrink-0">{key}</span>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow diagram */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">How it works</h2>
          <div className="space-y-2">
            {MENU_FLOW.map(({ step, detail, icon }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-xl">{icon}</span>
                  {i < MENU_FLOW.length - 1 && <div className="w-px h-6 bg-white/10 mt-1" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-medium text-white">{step}</p>
                  <p className="text-xs text-gray-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* USSD screen mockup */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">What you'll see on your phone</h2>
          <div className="rounded-2xl border border-white/10 bg-black p-6 font-mono text-sm text-green-400 space-y-1 leading-relaxed">
            <p className="text-gray-500 text-xs mb-3">── USSD Screen ──────────────────</p>
            <p>Welcome to GhostFi 👻</p>
            <p>Private banking on Solana</p>
            <p>&nbsp;</p>
            <p>1. Check Balance</p>
            <p>2. Send Money</p>
            <p>3. Shield Funds</p>
            <p>4. Unshield Funds</p>
            <p>5. My Virtual Card</p>
            <p>6. Transaction History</p>
            <p>0. Exit</p>
            <p>&nbsp;</p>
            <p className="text-gray-500">[ Enter: _ ]</p>
          </div>
        </div>

      </main>
    </>
  );
}
