/** @type {import('next').NextConfig} */
const path = require("path");
const fs = require("fs");

const umbraBase = path.resolve(__dirname, "node_modules/@umbra-privacy/sdk/node_modules/@solana");
const topBase = path.resolve(__dirname, "node_modules/@solana");

function resolveBrowser(pkg) {
  const candidates = [
    path.resolve(umbraBase, pkg, "dist/index.browser.mjs"),
    path.resolve(topBase, pkg, "dist/index.browser.mjs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const pkgs = [
  "kit", "errors", "transaction-messages", "transactions", "promises",
  "instruction-plans", "accounts", "addresses", "keys", "rpc",
  "rpc-types", "signers", "sysvars", "codecs", "codecs-core",
  "codecs-data-structures", "codecs-numbers", "codecs-strings",
  "functional", "nominal-types", "options", "programs", "assertions",
  "instructions", "rpc-api", "rpc-parsed-types", "rpc-spec",
  "rpc-spec-types", "rpc-subscriptions", "rpc-subscriptions-api",
  "rpc-subscriptions-channel-websocket", "rpc-subscriptions-spec",
  "rpc-transformers", "rpc-transport-http", "subscribable",
  "transaction-confirmation", "fast-stable-stringify",
];

// Build alias map
const aliasMap = {};
for (const pkg of pkgs) {
  const browser = resolveBrowser(pkg);
  if (browser) aliasMap[pkg] = browser;
}

// Custom webpack resolver plugin that applies aliases even inside node_modules
// Only intercepts requests from within @umbra-privacy/sdk or @solana/kit packages
// to avoid overriding local node_modules resolutions for other packages (e.g. offchain-messages)
class SolanaKitBrowserPlugin {
  apply(resolver) {
    const target = resolver.ensureHook("resolve");
    resolver.hooks.resolve.tapAsync("SolanaKitBrowserPlugin", (request, resolveContext, callback) => {
      const req = request.request || "";
      const issuer = request.context?.issuer || request.path || "";
      const match = req.match(/^@solana\/([^/]+)$/);
      // Only apply alias when the import originates from umbra-privacy/sdk or @solana/kit
      const fromUmbraOrKit = issuer.includes("@umbra-privacy") || issuer.includes("@solana/kit") || issuer.includes("@solana+kit");
      if (match && aliasMap[match[1]] && fromUmbraOrKit) {
        const newRequest = { ...request, request: aliasMap[match[1]] };
        return resolver.doResolve(target, newRequest, null, resolveContext, callback);
      }
      callback();
    });
  }
}

const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana-mobile/wallet-adapter-mobile": false,
      "@solana-mobile/wallet-standard-mobile": false,
      "@particle-network/chains": false,
      "@particle-network/auth": false,
      // snarkjs loaded via CDN — shim for both server and client builds
      "snarkjs": path.resolve(__dirname, "lib/snarkjs-shim.js"),
    };

    if (!isServer) {
      config.resolve.plugins = [...(config.resolve.plugins || []), new SolanaKitBrowserPlugin()];
    }

    return config;
  },
  transpilePackages: ["@umbra-privacy/sdk", "@umbra-privacy/web-zk-prover"],
};

module.exports = nextConfig;
