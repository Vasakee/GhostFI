import { getUmbraClient, createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import { getWallets } from "@wallet-standard/app";
import { VersionedTransaction } from "@solana/web3.js";

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
  const walletMatch = findWalletAccount(address);
  console.log("[getClient] walletMatch:", walletMatch ? `found: ${walletMatch.account.address}` : "null — using fallback signer");
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
      // DEBUG — remove after fixing
      console.log("[signTx] keys:", Object.keys(transaction));
      console.log("[signTx] full object:", JSON.stringify(
        transaction,
        (_, v) => v instanceof Uint8Array ? `Uint8Array(${v.length})` :
                  typeof v === "bigint" ? v.toString() : v,
        2
      ));

      const messageBytes: Uint8Array =
        transaction.messageBytes ??
        transaction.message?.serialize() ??
        (() => { throw new Error("Cannot extract message bytes from transaction"); })();
      const { VersionedMessage } = await import("@solana/web3.js");
      const vTx = new VersionedTransaction(VersionedMessage.deserialize(messageBytes));
      const signed = await signTransaction(vTx);
      const sig = signed.signatures[0];
      if (!sig || sig.every((b: number) => b === 0)) throw new Error("Wallet returned empty signature");
      return { ...transaction, signatures: { ...transaction.signatures, [address]: sig } };
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
// Ethereum contract (for reference): 0xfaf0cee6b20e2aaa4b80748a6af4cd89609a3d78
// TODO: Replace with the official Solana SPL mint — contact hello@palmusd.com or check their docs
export const PUSD_MINT = isDevnet
  ? "TODO_PUSD_DEVNET_MINT"
  : "TODO_PUSD_MAINNET_MINT";

export const SUPPORTED_TOKENS = [
  { symbol: "USDC", mint: USDC_MINT, decimals: 6 },
  { symbol: "USDT", mint: USDT_MINT, decimals: 6 },
  { symbol: "PUSD", mint: PUSD_MINT, decimals: 6, tag: "non-freezable" },
];
