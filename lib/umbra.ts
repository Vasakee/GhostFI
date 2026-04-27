import { getUmbraClient, createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import { getWallets } from "@wallet-standard/app";
import { VersionedTransaction, VersionedMessage } from "@solana/web3.js";

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

  _client = await getUmbraClient({
    signer: signer as any,
    network: (process.env.NEXT_PUBLIC_NETWORK as "mainnet" | "devnet") ?? "mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    rpcSubscriptionsUrl: process.env.NEXT_PUBLIC_RPC_WS_URL!,
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
      // The kit transaction carries the raw serialized message in `messageBytes`.
      // Build a web3.js VersionedTransaction from it (no signatures yet), have the
      // wallet sign it, then put the resulting signature back into the kit tx under
      // the signer's address key — which is what the kit signatures map expects.
      const messageBytes: Uint8Array = transaction.messageBytes;
      const vTx = new VersionedTransaction(VersionedMessage.deserialize(messageBytes));
      const signed = await signTransaction(vTx);
      const sig = signed.signatures[0];
      if (!sig || sig.every((b: number) => b === 0)) throw new Error("Wallet returned empty signature");
      return { ...transaction, signatures: { ...transaction.signatures, [address]: new Uint8Array(sig) } };
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

export const SUPPORTED_TOKENS = [
  { symbol: "USDC", mint: USDC_MINT, decimals: 6 },
  { symbol: "USDT", mint: USDT_MINT, decimals: 6 },
  { symbol: "PUSD", mint: PUSD_MINT, decimals: 6, tag: "non-freezable" },
];
