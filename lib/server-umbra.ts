import { Keypair } from "@solana/web3.js";
import { getUmbraClient } from "@umbra-privacy/sdk";
import {
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceQuerierFunction,
  getMasterViewingKeyDeriver,
} from "@umbra-privacy/sdk";
import {
  getUserRegistrationProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
} from "@umbra-privacy/web-zk-prover";
import nacl from "tweetnacl";

function buildServerSigner(keypair: Keypair) {
  const address = keypair.publicKey.toBase58();
  return {
    address: address as any,
    async signTransaction(transaction: any) {
      const messageBytes: Uint8Array = transaction.messageBytes;
      const sig = nacl.sign.detached(messageBytes, keypair.secretKey);
      return { ...transaction, signatures: { ...transaction.signatures, [address]: sig } };
    },
    async signTransactions(transactions: any[]) {
      return Promise.all(transactions.map((tx: any) => this.signTransaction(tx)));
    },
    async signMessage(message: Uint8Array) {
      const signature = nacl.sign.detached(message, keypair.secretKey);
      return { signer: address as any, message, signature };
    },
  };
}

export async function getServerUmbraClient(keypair: Keypair) {
  const isDevnet = (process.env.NEXT_PUBLIC_NETWORK as "mainnet" | "devnet") === "devnet";
  const indexerApiEndpoint = isDevnet
    ? "https://utxo-indexer.api-devnet.umbraprivacy.com"
    : "https://utxo-indexer.api.umbraprivacy.com";

  const rpcList = [
    process.env.NEXT_PUBLIC_RPC_URL,
    "https://api.mainnet-beta.solana.com",
    "https://solana-mainnet.g.allnodes.com",
    "https://solana.publicnode.com",
    "https://rpc.ankr.com/solana",
  ].filter(Boolean) as string[];

  let rpcUrl = "";
  for (const rpc of rpcList) {
    if (!rpc || rpc.includes("your-mainnet-rpc-endpoint")) continue;
    try {
      // Quick health check
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      });
      if (res.ok) {
        rpcUrl = rpc;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!rpcUrl) rpcUrl = "https://api.mainnet-beta.solana.com";

  const rpcSubscriptionsUrl = process.env.NEXT_PUBLIC_RPC_WS_URL || rpcUrl.replace("https://", "wss://");

  return getUmbraClient({
    signer: buildServerSigner(keypair) as any,
    network: isDevnet ? "devnet" : "mainnet",
    rpcUrl,
    rpcSubscriptionsUrl,
    indexerApiEndpoint,
    deferMasterSeedSignature: true,
  });
}

function getZkBase(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set. Required for server-side ZK proof generation.");
  return `${appUrl}/api/zk-assets`;
}

async function getProxiedAssetUrls(type: string, variant?: string) {
  const ZK_BASE = getZkBase();
  const manifest = await fetch(`${ZK_BASE}/manifest.json`).then((r) => r.json());
  const asset = manifest.assets[type];
  const entry = variant ? asset[variant] : asset;
  return { zkeyUrl: `${ZK_BASE}/${entry.url}`, wasmUrl: `${ZK_BASE}/${entry.url.replace(".zkey", ".wasm")}` };
}

const proxiedDeps = { assetProvider: { getAssetUrls: getProxiedAssetUrls } } as any;

export async function serverRegister(keypair: Keypair) {
  const client = await getServerUmbraClient(keypair);
  const zkProver = getUserRegistrationProver(proxiedDeps);
  const register = getUserRegistrationFunction({ client }, { zkProver });
  return register({ confidential: true, anonymous: true });
}

export async function serverShield(keypair: Keypair, mint: string, amount: bigint) {
  const client = await getServerUmbraClient(keypair);
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  return (deposit as any)(client.signer.address, mint, amount);
}

export async function serverUnshield(keypair: Keypair, mint: string, amount: bigint) {
  const client = await getServerUmbraClient(keypair);
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
  return (withdraw as any)(client.signer.address, mint, amount);
}

export async function serverSend(keypair: Keypair, recipient: string, mint: string, amount: bigint) {
  const client = await getServerUmbraClient(keypair);
  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver(proxiedDeps);
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({ client }, { zkProver });
  return (createUtxo as any)({ destinationAddress: recipient, mint, amount });
}

export async function serverGetBalance(keypair: Keypair, mints: string[]): Promise<Map<string, bigint>> {
  const client = await getServerUmbraClient(keypair);
  const query = getEncryptedBalanceQuerierFunction({ client });
  const results = await (query as any)(mints);
  const out = new Map<string, bigint>();
  for (const [mint, result] of (results as Map<any, any>).entries()) {
    out.set(mint as string, result.state === "shared" ? BigInt(result.balance) : 0n);
  }
  return out;
}

export async function serverExportViewingKey(keypair: Keypair): Promise<string> {
  const client = await getServerUmbraClient(keypair);
  const derive = getMasterViewingKeyDeriver({ client });
  const key = await derive();
  const keyBig = typeof key === "bigint" ? key : BigInt((key as any).toString());
  return keyBig.toString(16).padStart(64, "0");
}
