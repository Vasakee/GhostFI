import { getUmbraClient, createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import { getPollingTransactionForwarder } from "@umbra-privacy/sdk";
import { getTransactionEncoder, getTransactionDecoder } from "@solana/kit";
import { getWallets } from "@wallet-standard/app";
import { VersionedTransaction, VersionedMessage, PublicKey } from "@solana/web3.js";

let _client: Awaited<ReturnType<typeof getUmbraClient>> | null = null;
let _signerAddress: string | null = null;
let _signTxRef: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null = null;
let _cachedNetwork: string | null = null;

async function findWalletAccount(address: string) {
  // Phantom registers asynchronously — retry a few times before giving up
  for (let i = 0; i < 5; i++) {
    const { get } = getWallets();
    for (const wallet of get()) {
      for (const account of wallet.accounts) {
        if (account.address === address) return { wallet, account };
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

export async function getClient(
  address: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
) {
  const network = (process.env.NEXT_PUBLIC_NETWORK as "mainnet" | "devnet") ?? "mainnet";

  if (_client && _signerAddress === address && _signTxRef === signTransaction && _cachedNetwork === network) return _client;

  // Prefer the Wallet Standard signer — the SDK's createSignerFromWalletAccount
  // handles the @solana/kit transaction format natively, avoiding cross-SDK
  // serialization issues that cause signature verification failures.
  const walletMatch = await findWalletAccount(address);
  console.log(`[umbra] signer: ${walletMatch ? "wallet-standard (" + walletMatch.wallet.name + ")" : "fallback"}`);

  // Intercept createSignerFromWalletAccount to log what Phantom returns
  let signer: any;
  if (walletMatch) {
    const { getTransactionEncoder, getTransactionDecoder } = await import("@solana/kit");
    const encoder = getTransactionEncoder();
    const decoder = getTransactionDecoder();
    const signTxFeature = (walletMatch.wallet.features as any)["solana:signTransaction"];
    signer = {
      address: walletMatch.account.address,
      async signTransaction(transaction: any) {
        const wireBytes = encoder.encode(transaction);
        console.log("[umbra] wireBytes prefix:", Array.from((wireBytes as Uint8Array).slice(0, 6)));
        const [output] = await signTxFeature.signTransaction({ account: walletMatch.account, transaction: wireBytes });
        console.log("[umbra] phantom output prefix:", Array.from((output.signedTransaction as Uint8Array).slice(0, 6)));
        const decoded = decoder.decode(output.signedTransaction);
        console.log("[umbra] decoded sigs:", JSON.stringify(Object.entries(decoded.signatures ?? {}).map(([k, v]) => [k.slice(0,8), Array.from((v as any).slice(0,4))])));
        // Simulate to get detailed error logs
        try {
          const { createSolanaRpc } = await import("@solana/kit");
          const rpc = createSolanaRpc(rpcUrl);
          const { getBase64EncodedWireTransaction } = await import("@solana/kit");
          const signed = { ...transaction, signatures: { ...transaction.signatures, ...decoded.signatures } };
          const wire = getBase64EncodedWireTransaction(signed as any);
          const sim = await (rpc as any).simulateTransaction(wire, { encoding: "base64", sigVerify: false }).send();
          console.log("[umbra] simulation logs:", JSON.stringify(sim?.value?.logs));
          console.log("[umbra] simulation err:", JSON.stringify(sim?.value?.err));
        } catch(e: any) { console.log("[umbra] sim error:", e.message); }
        return { ...transaction, signatures: { ...transaction.signatures, ...decoded.signatures } };
      },
      async signTransactions(transactions: any[]) {
        return Promise.all(transactions.map((tx: any) => this.signTransaction(tx)));
      },
      async signMessage(message: Uint8Array) {
        const signMessageFeature = (walletMatch.wallet.features as any)["solana:signMessage"];
        const [output] = await signMessageFeature.signMessage({ account: walletMatch.account, message });
        return { signer: walletMatch.account.address, message, signature: output.signature };
      },
    };
  } else {
    signer = buildFallbackSigner(address, signTransaction, signMessage);
  }

  let rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "";
  if (!rpcUrl || !rpcUrl.startsWith("http") || rpcUrl.includes("your-mainnet-rpc-endpoint")) {
    rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://solana.publicnode.com";
  }
  // If using a relative proxy path (/api/rpc), resolve to absolute for the SDK
  if (rpcUrl.startsWith("/")) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://www.ghostfi.live";
    rpcUrl = `${base}${rpcUrl}`;
  }

  // Derive WebSocket URL only from absolute http(s) URLs; never derive from proxy paths
  const rpcWs = process.env.NEXT_PUBLIC_RPC_WS_URL ||
    (rpcUrl.includes("api.devnet.solana.com")
      ? "wss://api.devnet.solana.com"
      : (rpcUrl.startsWith("https://") && !rpcUrl.includes("/api/")
        ? rpcUrl.replace("https://", "wss://")
        : rpcUrl.startsWith("http://") && !rpcUrl.includes("/api/")
        ? rpcUrl.replace("http://", "ws://")
        : "wss://solana.publicnode.com"));

  const indexerApiEndpoint = network === "devnet"
    ? "https://utxo-indexer.api-devnet.umbraprivacy.com"
    : "https://utxo-indexer.api.umbraprivacy.com";

  // Use polling forwarder (no WebSocket dependency)
  const transactionForwarder = getPollingTransactionForwarder({ rpcUrl });

  _client = await getUmbraClient({
    signer: signer as any,
    network,
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    indexerApiEndpoint,
    deferMasterSeedSignature: true,
  }, { transactionForwarder } as any);
  _signerAddress = address;
  _signTxRef = signTransaction;
  _cachedNetwork = network;
  return _client;
}

// Fallback for wallets that don't expose a Wallet Standard account
function buildFallbackSigner(
  address: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
) {
  return {
    address: address as any,
    async signTransaction(transaction: any) {
      // Encode the full v2 transaction as wire bytes (includes signature slots prefix),
      // pass to Phantom via signTransaction (v1 VersionedTransaction accepts same wire format),
      // then decode the signed output back into v2 format.
      const encoder = getTransactionEncoder();
      const decoder = getTransactionDecoder();
      const wireBytes = encoder.encode(transaction);
      const vTx = VersionedTransaction.deserialize(wireBytes);
      const signed = await signTransaction(vTx);
      
      // CRITICAL: We MUST return the full decoded transaction.
      // If the wallet added a memo, priority fee, or other modifications,
      // returning only the signatures for the original transaction will fail verification.
      return decoder.decode(signed.serialize());
    },
    async signTransactions(transactions: any[]) {
      return Promise.all(transactions.map((tx: any) => this.signTransaction(tx)));
    },
    async signMessage(message: Uint8Array) {
      const signature = await signMessage(message);
      const sigBytes = (signature as any)?.signature instanceof Uint8Array
        ? (signature as any).signature
        : signature;
      return { signer: address as any, message, signature: sigBytes };
    },
  };
}

export function resetClient() {
  _client = null;
  _signerAddress = null;
  _signTxRef = null;
}

const isDevnet = process.env.NEXT_PUBLIC_NETWORK === "devnet";

export const USDC_MINT = isDevnet
  ? "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7"  // Umbra faucet dUSDC
  : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDT_MINT = isDevnet
  ? "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6"  // Umbra faucet dUSDT
  : "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

// Palm USD — non-freezable, non-blacklistable USD stablecoin on Solana
// Solana mainnet SPL mint: https://solscan.io/account/CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s
export const PUSD_MINT = "CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s";

// USDG (Paxos Gold/USDG) — often used in Superteam Earn tracks
// Mint: https://solscan.io/account/DqhKzDqMhT9i7G6C2S3TzX8V9TfC1v5C9DqhKzDqMhT9
export const USDG_MINT = "DqhKzDqMhT9i7G6C2S3TzX8V9TfC1v5C9DqhKzDqMhT9";

export const SUPPORTED_TOKENS = [
  { symbol: "USDC", mint: USDC_MINT, decimals: 6 },
  { symbol: "USDT", mint: USDT_MINT, decimals: 6 },
  { symbol: "PUSD", mint: PUSD_MINT, decimals: 6, tag: "non-freezable" },
  { symbol: "USDG", mint: USDG_MINT, decimals: 6, tag: "paxos" },
];
