import { Navbar } from "@/components/Navbar";
import { MessageCircle, Shield, Send, Eye, CreditCard, Clock, MapPin, HelpCircle } from "lucide-react";

const COMMANDS = [
  { cmd: "balance", icon: "💰", desc: "Check your private encrypted balance" },
  { cmd: "send [amount] [phone]", icon: "📤", desc: "Send USDC privately to any phone number" },
  { cmd: "shield [amount]", icon: "🔒", desc: "Move USDC into your private balance" },
  { cmd: "unshield [amount]", icon: "🔓", desc: "Move USDC back to your public wallet" },
  { cmd: "card", icon: "💳", desc: "View your virtual card (masked)" },
  { cmd: "reveal card", icon: "👁", desc: "Show full card number and CVV" },
  { cmd: "history", icon: "📋", desc: "Last 5 transactions" },
  { cmd: "address", icon: "🔑", desc: "Your GhostFi wallet address" },
  { cmd: "help", icon: "ℹ️", desc: "Show all commands" },
];

export default function WhatsAppPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-2">
            <MessageCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">GhostFi WhatsApp Bot</h1>
          <p className="text-gray-400">Manage your private Solana bank entirely through WhatsApp — no app needed.</p>
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
              <MessageCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="text-xs text-gray-600 font-mono">Twilio Sandbox QR</p>
              <p className="text-[10px] text-gray-400">Add your QR from<br />console.twilio.com</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-white font-semibold text-lg">Scan to start chatting with GhostFi</p>
            <p className="text-gray-400 text-sm">Or save <span className="text-green-400 font-mono">+1 415 523 8886</span> and send <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">join &lt;sandbox-word&gt;</span></p>
          </div>
          <a
            href="https://wa.me/14155238886"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
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
              "Save the Twilio sandbox number and send the join code",
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
