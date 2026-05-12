import { Navbar } from "@/components/Navbar";
import { Shield } from "lucide-react";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const COMMANDS = [
  { cmd: "balance", icon: "💰", desc: "Check your private encrypted balance" },
  { cmd: "send [amount] [phone]", icon: "📤", desc: "Send USDC privately to any phone number" },
  { cmd: "shield [amount]", icon: "🔒", desc: "Move USDC into your private balance" },
  { cmd: "unshield [amount]", icon: "🔓", desc: "Move USDC back to your public wallet" },
  { cmd: "card", icon: "💳", desc: "View your virtual card (masked)" },
  { cmd: "reveal card", icon: "👁", desc: "Show full card number and CVV" },
  { cmd: "withdraw [amount] [bank] [acc]", icon: "🏦", desc: "Withdraw to your local bank account" },
  { cmd: "history", icon: "📋", desc: "Last 5 transactions" },
  { cmd: "address", icon: "🔑", desc: "Your GhostFi wallet address" },
  { cmd: "help", icon: "ℹ️", desc: "Show all commands" },
];

export default function WhatsAppPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-10 space-y-8 pb-28 md:pb-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-2">
            <WhatsAppIcon className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">GhostFi WhatsApp Bot</h1>
          <p className="text-gray-400">Manage your private Solana bank entirely through WhatsApp — no app needed. Powered by Umbra Protocol.</p>
        </div>

        {/* Custodial notice */}
        <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            <span className="font-semibold">Custodial wallet:</span> The bot manages a server-side wallet tied to your phone number. Your private key is AES-256 encrypted at rest. Never share your phone number with others for this service.
          </p>
        </div>

        {/* QR / CTA */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center space-y-4">
          <p className="text-sm text-gray-400 uppercase tracking-widest font-medium">Scan to start</p>
          {/* Twilio sandbox QR placeholder — replace src with actual Twilio sandbox QR image */}
          <div className="mx-auto w-48 h-48 rounded-xl bg-white flex items-center justify-center">
            <div className="text-center space-y-2">
              <WhatsAppIcon className="w-10 h-10 text-purple-500 mx-auto" />
              <p className="text-xs text-gray-600 font-mono">Twilio Sandbox QR</p>
              <p className="text-[10px] text-gray-400">Add your QR from<br />console.twilio.com</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-white font-semibold text-lg">Scan to start chatting with GhostFi</p>
            <p className="text-gray-400 text-sm">Or save <span className="text-purple-400 font-mono">+234 703 494 2522</span> and send <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">Hello</span></p>
          </div>
          <a
            href="https://wa.me/2347034942522"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Open in WhatsApp
          </a>
        </div>

        {/* Commands */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Available Commands</h2>
          <div className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
            {COMMANDS.map(({ cmd, icon, desc }) => (
              <div key={cmd} className="flex items-center gap-4 px-4 py-3 bg-white/2 hover:bg-white/5 transition-colors">
                <span className="text-xl w-7 text-center shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="font-mono text-sm text-purple-300">{cmd}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">How it works</h2>
          <ol className="space-y-3">
            {[
              "Save the GhostFi number and send 'Hello' to begin",
              "Your GhostFi wallet is created automatically on first message",
              "Send commands like 'balance' or 'shield 10' to manage funds",
              "All transactions use Umbra's ZK privacy infrastructure on Solana",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-gray-300">{step}</p>
              </li>
            ))}
          </ol>
        </div>

      </main>
    </>
  );
}
