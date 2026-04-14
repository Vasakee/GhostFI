import {
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getClaimableUtxoScannerFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getEncryptedBalanceQuerierFunction,
  getMasterViewingKeyDeriver,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import type { Address } from "@solana/addresses";
import {
  getUserRegistrationProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
} from "@umbra-privacy/web-zk-prover";

const RELAYER = { apiEndpoint: "https://relayer.api.umbraprivacy.com" };

const addr = (s: string) => s as unknown as Address;
const u64 = (n: bigint) => n as unknown as any;
const u32 = (n: number) => n as unknown as any;

// Proxy asset provider — routes ZK circuit fetches through our Next.js API
// to avoid CORS issues with the CloudFront CDN
async function getProxiedAssetUrls(type: string, variant?: string) {
  const base = "/api/zk-assets";
  const manifest = await fetch(`${base}/manifest.json`).then((r) => r.json());
  const asset = manifest.assets[type];
  const entry = variant ? asset[variant] : asset;
  return {
    zkeyUrl: `${base}/${entry.url}`,
    wasmUrl: `${base}/${entry.url.replace(".zkey", ".wasm")}`,
  };
}

const proxiedAssetProvider = { getAssetUrls: getProxiedAssetUrls };
const proxiedDeps = { assetProvider: proxiedAssetProvider } as any;

export async function registerAccount(client: any) {
  const zkProver = getUserRegistrationProver(proxiedDeps);
  const register = getUserRegistrationFunction({ client }, { zkProver });
  return register({ confidential: true, anonymous: true });
}

export async function shieldTokens(client: any, mint: string, amount: bigint) {
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  return deposit(addr(client.signer.address), addr(mint), u64(amount));
}

export async function unshieldTokens(client: any, mint: string, amount: bigint) {
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
  return withdraw(addr(client.signer.address), addr(mint), u64(amount));
}

export async function privateSend(
  client: any,
  recipient: string,
  mint: string,
  amount: bigint
) {
  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver(proxiedDeps);
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver }
  );
  return createUtxo({ destinationAddress: addr(recipient), mint: addr(mint), amount: u64(amount) });
}

export async function scanUtxos(client: any) {
  const scan = getClaimableUtxoScannerFunction({ client });
  const { received } = await scan(u32(0), u32(0));
  return received;
}

export async function claimUtxos(client: any, utxos: any[]) {
  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver(proxiedDeps);
  const relayer = getUmbraRelayer(RELAYER);
  const deps: any = { zkProver, relayer };
  // fetchBatchMerkleProof is wired into the client when indexerApiEndpoint is set
  if (client.fetchBatchMerkleProof) {
    deps.fetchBatchMerkleProof = client.fetchBatchMerkleProof;
  }
  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    deps
  );
  return claim(utxos);
}

export async function fetchEncryptedBalances(client: any, mints: string[]): Promise<Map<string, bigint>> {
  const query = getEncryptedBalanceQuerierFunction({ client });
  const results = await query(mints.map(addr));
  const out = new Map<string, bigint>();
  for (const [mint, result] of (results as Map<any, any>).entries()) {
    out.set(mint as string, result.state === "shared" ? BigInt(result.balance) : 0n);
  }
  return out;
}

export async function exportMasterViewingKey(client: any): Promise<string> {
  const derive = getMasterViewingKeyDeriver({ client });
  const key = await derive();
  return key.toString(16).padStart(64, "0");
}
