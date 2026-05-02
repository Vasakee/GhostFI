"use client";

import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

export function Polyfills() {
  return null;
}
