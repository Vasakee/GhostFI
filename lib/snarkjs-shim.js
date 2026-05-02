// snarkjs shim — the real library is loaded via CDN <script> in layout.tsx
// This shim ensures that imports of 'snarkjs' don't crash the application
// even if the CDN script hasn't finished loading yet.

const isBrowser = typeof window !== "undefined";

const snarkjsProxy = new Proxy({}, {
  get(target, prop) {
    if (isBrowser && window.snarkjs) {
      return window.snarkjs[prop];
    }
    // Return a dummy object for common snarkjs properties to avoid immediate crashes
    if (prop === 'groth16') return {
      fullProve: async () => { throw new Error("snarkjs.groth16.fullProve called before library loaded"); },
      verify: async () => { throw new Error("snarkjs.groth16.verify called before library loaded"); },
    };
    if (prop === 'wtns') return {
        calculate: async () => { throw new Error("snarkjs.wtns.calculate called before library loaded"); },
    };
    return {};
  }
});

// Use CommonJS export to satisfy webpack's named import checks during build
// as the Umbra SDK expects 'wtns' and 'groth16' as named exports.
module.exports = snarkjsProxy;
module.exports.groth16 = snarkjsProxy.groth16;
module.exports.wtns = snarkjsProxy.wtns;
