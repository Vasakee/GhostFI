"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  position: number; name: string; email: string; country: string;
  phone: string; referralSource: string; referralCount: number;
  createdAt: string; converted: boolean;
};

type Stats = {
  total: number;
  byCountry: { _id: string; count: number }[];
  bySource: { _id: string; count: number }[];
  byDay: { _id: string; count: number }[];
  entries: Entry[];
};

function exportCSV(entries: Entry[]) {
  const header = "Position,Name,Email,Country,Phone,Source,Referrals,Date";
  const rows = entries.map(e =>
    [e.position, `"${e.name}"`, e.email, e.country, e.phone, e.referralSource, e.referralCount,
      new Date(e.createdAt).toLocaleDateString()].join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "ghostfi-waitlist.csv"; a.click();
}

export default function AdminWaitlist() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/admin/waitlist?password=${encodeURIComponent(pw)}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data);
      setAuthed(true);
    } else {
      setPwError("Wrong password");
    }
    setLoading(false);
  }

  const filtered = stats?.entries.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.country.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={login} className="glass rounded-2xl border border-white/8 p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-white text-center">👻 Admin Access</h1>
          <input
            type="password" placeholder="Password" value={pw}
            onChange={e => setPw(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
          {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold text-sm disabled:opacity-60">
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">👻 Waitlist Admin</h1>
        <button onClick={() => exportCSV(stats?.entries ?? [])}
          className="px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition-colors">
          Export CSV
        </button>
      </div>

      {/* Total */}
      <div className="glass rounded-2xl border border-purple-500/20 p-8 text-center">
        <p className="text-gray-400 text-sm mb-1">Total Signups</p>
        <p className="text-6xl font-bold gradient-text">{stats?.total ?? 0}</p>
      </div>

      {/* Charts — simple bar representations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Country */}
        <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-300">By Country</p>
          {(stats?.byCountry ?? []).slice(0, 8).map(c => (
            <div key={c._id} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{c._id || "Unknown"}</span><span>{c.count}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full"
                  style={{ width: `${Math.min(100, (c.count / (stats?.total || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* By Source */}
        <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-300">By Referral Source</p>
          {(stats?.bySource ?? []).map(s => (
            <div key={s._id} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{s._id || "Unknown"}</span><span>{s.count}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
                  style={{ width: `${Math.min(100, (s.count / (stats?.total || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily signups */}
      <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-300">Daily Signups (last 14 days)</p>
        <div className="flex items-end gap-1 h-20">
          {(stats?.byDay ?? []).slice(-14).map(d => {
            const max = Math.max(...(stats?.byDay ?? []).map(x => x.count), 1);
            return (
              <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  {d._id}: {d.count}
                </div>
                <div className="w-full bg-gradient-to-t from-purple-600 to-violet-400 rounded-sm"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: "2px" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <input
            type="text" placeholder="Search by name, email, country..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                {["#", "Name", "Email", "Country", "Phone", "Source", "Refs", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.email} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-4 py-3 text-purple-400 font-mono text-xs">#{e.position}</td>
                  <td className="px-4 py-3 text-white font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-gray-300">{e.email}</td>
                  <td className="px-4 py-3 text-gray-400">{e.country}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.referralSource || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {e.referralCount > 0
                      ? <span className="text-green-400 font-semibold">{e.referralCount}</span>
                      : <span className="text-gray-700">0</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-600">No results</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
