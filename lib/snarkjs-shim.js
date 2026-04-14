// snarkjs shim — the real library is loaded via CDN <script> in layout.tsx
// On the server this returns an empty object (ZK ops only run in browser)
// On the client, window.snarkjs is populated by the CDN script before any ZK call
if (typeof module !== "undefined") {
  module.exports = typeof globalThis !== "undefined" && globalThis.snarkjs
    ? globalThis.snarkjs
    : {};
}
