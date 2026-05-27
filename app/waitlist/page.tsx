"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GhostLogo } from "@/components/GhostLogo";

const COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "United Kingdom", "United States", "Canada",
  "---",
  "Afghanistan","Albania","Algeria","Angola","Argentina","Australia","Austria","Azerbaijan",
  "Bangladesh","Belgium","Bolivia","Bosnia","Botswana","Brazil","Bulgaria","Burkina Faso",
  "Cameroon","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Czech Republic",
  "Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia",
  "Finland","France","Gabon","Gambia","Georgia","Germany","Guatemala","Guinea","Haiti",
  "Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kosovo","Kuwait","Kyrgyzstan",
  "Latvia","Lebanon","Libya","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia",
  "Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Mongolia","Morocco",
  "Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone",
  "Singapore","Slovakia","Slovenia","Somalia","Spain","Sri Lanka","Sudan","Sweden",
  "Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tunisia",
  "Turkey","Uganda","Ukraine","United Arab Emirates","Uruguay","Uzbekistan","Venezuela",
  "Vietnam","Yemen","Zambia","Zimbabwe",
];

const DIAL_CODES = [
  { code: "+234", country: "NG" }, { code: "+254", country: "KE" },
  { code: "+233", country: "GH" }, { code: "+27", country: "ZA" },
  { code: "+44", country: "GB" },  { code: "+1", country: "US" },
  { code: "+1", country: "CA" },   { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },  { code: "+91", country: "IN" },
  { code: "+55", country: "BR" },  { code: "+86", country: "CN" },
];

const SOURCES = ["Twitter/X", "Superteam", "Friend/Referral", "Telegram/Discord", "Other"];

const WAITLIST_URL = String(process.env.NEXT_PUBLIC_WAITLIST_URL ?? "https://ghostfi.live/waitlist");

function ShareButtons({ position, referralCode }: { position: number; referralCode: string }) {
  const refLink = `${WAITLIST_URL}?ref=${referralCode}`;
  const tweetText = encodeURIComponent(`I just joined the @GhostFi_xyz waitlist — private banking on Solana is coming 👻\nJoin here: ${refLink}`);
  const waText = encodeURIComponent(`Have you heard about GhostFi? Private banking on Solana — your balance stays invisible.\nJoin the waitlist: ${refLink}`);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 w-full">
      <p className="text-xs text-gray-400 text-center">Move up the waitlist — share with friends</p>
      <div className="flex gap-2 justify-center flex-wrap">
        <a href={`https://twitter.com/intent/tweet?text=${tweetText}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black border border-white/10 text-white text-xs font-medium hover:bg-white/5 transition-colors">
          𝕏 Share on X
        </a>
        <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-300 text-xs font-medium hover:bg-green-600/30 transition-colors">
          💬 WhatsApp
        </a>
        <button onClick={copy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors">
          {copied ? "✓ Copied!" : "🔗 Copy link"}
        </button>
      </div>
      <p className="text-[11px] text-gray-600 text-center">Your referral link: <span className="text-purple-400">{refLink}</span></p>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </main>
    }>
      <WaitlistContent />
    </Suspense>
  );
}

function WaitlistContent() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";

  const [count, setCount] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", dialCode: "+234", country: "", referralSource: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ position: number; email: string; referralCode: string } | null>(null);

  useEffect(() => {
    fetch("/api/waitlist").then(r => r.json()).then(d => setCount(d.count ?? 0)).catch(() => {});
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.country) e.country = "Please select your country";
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone ? `${form.dialCode}${form.phone}` : "",
          country: form.country,
          referralSource: form.referralSource,
          ref,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { setErrors({ email: text }); return; }

      const pos = Number(data.position) || 0;
      const code = String(data.referralCode ?? "");
      if (data.success || pos > 0) {
        setCount(c => c + 1);
        setSuccess({ position: pos, email: form.email.trim(), referralCode: code });
      } else {
        setErrors({ email: String(data.error ?? "Something went wrong") });
      }
    } catch (err: any) {
      setErrors({ email: String(err?.message ?? "Network error") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 relative overflow-hidden">
      {/* Extra glow for this page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center gap-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in-up-1">
          <Link href="/" className="mb-2">
            <GhostLogo size={48} />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-purple-500/20 text-xs text-purple-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Coming Soon
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Private Banking<br />
            <span className="gradient-text">is Coming.</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm">
            Be the first to experience GhostFi — the neobank where your balance is invisible,
            your transfers are confidential, and you spend anywhere with a virtual card.
          </p>
        </div>

        {/* Counter */}
        <div className="animate-fade-in-up-2 flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-white/8">
          <span className="flex -space-x-1.5">
            {["🇳🇬","🇬🇧","🇺🇸","🇰🇪","🇬🇭"].map((f, i) => (
              <span key={i} className="text-base">{f}</span>
            ))}
          </span>
          <span className="text-sm text-gray-300">
            Join <span className="text-white font-bold">{count.toLocaleString()}</span> people already waiting
          </span>
        </div>

        {/* Form / Success */}
        <div className="w-full animate-fade-in-up-3">
          {success ? (
            <div className="glass rounded-2xl border border-purple-500/20 p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-3xl animate-fade-in">
                ✓
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">You're on the list! 👻</h2>
                <p className="text-gray-400 text-sm">We'll notify you at <span className="text-white">{success.email}</span> when GhostFi launches.</p>
              </div>
              <div className="px-6 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-gray-400">Your position</p>
                <p className="text-3xl font-bold gradient-text">#{success.position}</p>
                <p className="text-xs text-gray-500">in line</p>
              </div>
              {success.referralCode && <ShareButtons position={success.position} referralCode={success.referralCode} />}
            </div>
          ) : (
            <form onSubmit={submit} className="glass rounded-2xl border border-white/8 p-6 sm:p-8 space-y-4">
              {/* Name */}
              <div>
                <input
                  type="text" placeholder="Full name *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <input
                  type="email" placeholder="Email address *" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="flex gap-2">
                <select
                  value={form.dialCode}
                  onChange={e => setForm(f => ({ ...f, dialCode: e.target.value }))}
                  className="bg-[#13131f] border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  {DIAL_CODES.map((d, i) => (
                    <option key={i} value={d.code}>{d.code} {d.country}</option>
                  ))}
                </select>
                <input
                  type="tel" placeholder="Phone number (optional)" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {/* Country */}
              <div>
                <select
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="">Country *</option>
                  {COUNTRIES.map((c, i) =>
                    c === "---"
                      ? <option key="sep" disabled>──────────</option>
                      : <option key={i} value={c}>{c}</option>
                  )}
                </select>
                {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
              </div>

              {/* Referral source */}
              <div>
                <select
                  value={form.referralSource}
                  onChange={e => setForm(f => ({ ...f, referralSource: e.target.value }))}
                  className="w-full bg-[#13131f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="">How did you hear about us? (optional)</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button
                type="submit" disabled={loading}
                className="relative w-full py-3.5 rounded-xl font-semibold text-white overflow-hidden disabled:opacity-60 transition-all
                  bg-gradient-to-r from-purple-600 to-violet-600 hover:shadow-lg hover:shadow-purple-500/30
                  before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                  before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : "Join the Waitlist 👻"}
              </button>
            </form>
          )}
        </div>

        {/* Why GhostFi */}
        <div className="w-full space-y-3 animate-fade-in-up">
          <p className="text-center text-xs uppercase tracking-widest text-gray-600">Why GhostFi</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🔒", title: "Private by Default", desc: "Your balance is encrypted on-chain. Nobody sees your money but you." },
              { icon: "📱", title: "Bank from Any Phone", desc: "WhatsApp banking and USSD support — no smartphone or internet required." },
            ].map(f => (
              <div key={f.title} className="glass glass-hover rounded-2xl p-4 text-center space-y-2">
                <div className="text-2xl">{f.icon}</div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Built on */}
        <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in-up">
          {[
            { label: "Built on Solana", color: "text-purple-300 border-purple-500/20 bg-purple-500/5" },
            { label: "Powered by Umbra Protocol", color: "text-blue-300 border-blue-500/20 bg-blue-500/5" },
          ].map(b => (
            <span key={b.label} className={`px-3 py-1.5 rounded-full border text-xs font-medium ${b.color}`}>
              {b.label}
            </span>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center space-y-1.5 pb-4 animate-fade-in-up">
          <a href="https://twitter.com/ghostfinancee" target="_blank" rel="noopener noreferrer"
            className="block text-gray-500 hover:text-white text-sm transition-colors">
            @ghostfinancee
          </a>
          <p className="text-xs text-gray-700">© 2026 GhostFi. Your money. Your business.</p>
        </footer>
      </div>
    </main>
  );
}
