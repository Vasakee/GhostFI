import { getUmbraClient } from "@umbra-privacy/sdk";
import { VersionedTransaction, VersionedMessage } from "@solana/web3.js";
import type { Address } from "@solana/addresses";

let _client: Awaited<ReturnType<typeof getUmbraClient>> | null = null;
let _signerAddress: string | null = null;
let _signTxRef: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null = null;
let _signMsgRef: ((msg: Uint8Array) => Promise<Uint8Array>) | null = null;

function buildSigner(
  address: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
) {
  return {
    address: address as Address,

    async signTransaction(transaction: any) {
      // transaction.messageBytes is the raw serialized v0 message (starts with 0x80).
      // VersionedMessage.deserialize parses it; new VersionedTransaction wraps it
      // with empty signatures so the wallet can sign it properly.
      const message = VersionedMessage.deserialize(
        // Ensure we have a plain Uint8Array copy, not a subarray view
        transaction.messageBytes instanceof Uint8Array
          ? transaction.messageBytes.slice()
          : new Uint8Array(transaction.messageBytes)
      );
      const vTx = new VersionedTransaction(message);
      const signed = await signTransaction(vTx);
      // signed.signatures[0] is the fee payer (first required signer) signature
      return {
        ...transaction,
        signatures: { ...transaction.signatures, [address]: signed.signatures[0] },
      };
    },

    async signTransactions(transactions: any[]) {
      return Promise.all(transactions.map((tx: any) => this.signTransaction(tx)));
    },

    async signMessage(message: Uint8Array) {
      const signature = await signMessage(message);
      return { signer: address as Address, message, signature };
    },
  };
}

export async function getClient(
  address: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
) {
  if (_client && _signerAddress === address && _signTxRef === signTransaction) return _client;

  const signer = buildSigner(address, signTransaction, signMessage);

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
  _signMsgRef = signMessage;
  return _client;
}

export function resetClient() {
  _client = null;
  _signerAddress = null;
  _signTxRef = null;
  _signMsgRef = null;
}

const isDevnet = process.env.NEXT_PUBLIC_NETWORK === "devnet";

export const USDC_MINT = isDevnet
  ? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDT_MINT = isDevnet
  ? "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS"
  : "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export const SUPPORTED_TOKENS = [
  { symbol: "USDC", mint: USDC_MINT, decimals: 6 },
  { symbol: "USDT", mint: USDT_MINT, decimals: 6 },
];
