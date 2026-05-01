"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4 text-center">
      <p className="text-5xl">👻</p>
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="text-gray-400 text-sm max-w-sm">{error.message || "An unexpected error occurred."}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition">Try again</button>
        <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition">Go home</Link>
      </div>
    </div>
  );
}
