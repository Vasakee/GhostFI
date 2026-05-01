import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4 text-center">
      <p className="text-5xl">👻</p>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="text-gray-400 text-sm">This page doesn't exist or has moved.</p>
      <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition">Go to Dashboard</Link>
    </div>
  );
}
