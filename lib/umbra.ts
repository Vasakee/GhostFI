import { getUmbraClient, createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import { getWallets } from "@wallet-standard/app";
import { VersionedTransaction, VersionedMessage, PublicKey } from "@solana/web3.js";

let _client: Awaited<ReturnType<typeof getUmbraClient>> | null = null;
let _signerAddress: string | null = null;
let _signTxRef: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null = null;

function findWalletAccount(address: string) {
  const { get } = getWallets();
  for (const wallet of get()) {
    for (const account of wallet.accounts) {
      if (account.address === address) return { wallet, account };
    }
  }
  return null;
}

export async function getClient(
  address: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
) {
  if (_client && _signerAddress === address && _signTxRef === signTransaction) return _client;

  // Prefer the Wallet Standard signer — the SDK's createSignerFromWalletAccount
  // handles the @solana/kit transaction format natively, avoiding cross-SDK
  // serialization issues that cause signature verification failures.
  // Try the Wallet Standard signer first (SDK-native path).
  // Fall back to the manual signer only if no Wallet Standard account is found.
  const walletMatch = findWalletAccount(address);
  const signer = walletMatch
    ? createSignerFromWalletAccount(walletMatch.wallet, walletMatch.account)
    : buildFallbackSigner(address, signTransaction, signMessage);

  let rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://solana.publicnode.com";
  if (!rpcUrl || rpcUrl.includes("your-mainnet-rpc-endpoint")) {
    rpcUrl = "https://solana.publicnode.com";
  }
  // If using a relative proxy path (/api/rpc), resolve to absolute for the SDK
  if (rpcUrl.startsWith("/")) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://www.ghostfi.live";
    rpcUrl = `${base}${rpcUrl}`;
  }

  // Derive WebSocket URL only from absolute http(s) URLs
  const rpcWs = process.env.NEXT_PUBLIC_RPC_WS_URL ||
    (rpcUrl.startsWith("https://") ? rpcUrl.replace("https://", "wss://") :
     rpcUrl.startsWith("http://") ? rpcUrl.replace("http://", "ws://") : rpcUrl);

  _client = await getUmbraClient({
    signer: signer as any,
    network: (process.env.NEXT_PUBLIC_NETWORK as "mainnet" | "devnet") ?? "mainnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    indexerApiEndpoint: "https://utxo-indexer.api.umbraprivacy.com",
    deferMasterSeedSignature: true,
  });
  _signerAddress = address;
  _signTxRef = signTransaction;
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
      const messageBytes: Uint8Array = transaction.messageBytes;
      const vTx = new VersionedTransaction(VersionedMessage.deserialize(messageBytes));
      const signed = await signTransaction(vTx);

      // Map signatures back by key
      const newSignatures: Record<string, Uint8Array> = { ...(transaction.signatures ?? {}) };
      
      // Look up the index of the signer's public key in the transaction's static account keys
      const signerPublicKey = new PublicKey(address);
      const index = signed.message.staticAccountKeys.findIndex(k => k.equals(signerPublicKey));
      
      if (index === -1) {
        console.error("[buildFallbackSigner] Signer not found in transaction keys", address);
        throw new Error("Signer not found in transaction keys");
      }

      const sig = signed.signatures[index];
      if (!sig || sig.every((b: number) => b === 0)) {
        throw new Error("Wallet returned empty signature");
      }

      newSignatures[address] = new Uint8Array(sig);
      
      return { 
        ...transaction, 
        signatures: newSignatures
      };
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
  ? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDT_MINT = isDevnet
  ? "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS"
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
