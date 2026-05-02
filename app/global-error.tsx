"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4 text-center bg-[#080810] text-white">
          <p className="text-5xl">👻</p>
          <h1 className="text-2xl font-bold">Critical Application Error</h1>
          <p className="text-gray-400 text-sm max-w-sm">
            {error.message || "A fatal error occurred in the root layout."}
          </p>
          {error.stack && (
            <pre className="text-[10px] text-red-400/60 bg-red-900/10 p-4 rounded-xl max-w-full overflow-auto text-left">
              {error.stack}
            </pre>
          )}
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
