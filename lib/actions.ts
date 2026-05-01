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
  getUserAccountQuerierFunction,
} from "@umbra-privacy/sdk";
import {
  getUserRegistrationProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
} from "@umbra-privacy/web-zk-prover";

const isDevnet = process.env.NEXT_PUBLIC_NETWORK === "devnet";
const RELAYER_URL = isDevnet 
  ? "https://relayer.api-devnet.umbraprivacy.com" 
  : "https://relayer.api.umbraprivacy.com";

const RELAYER = { apiEndpoint: RELAYER_URL };

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

const proxiedDeps = { assetProvider: { getAssetUrls: getProxiedAssetUrls } } as any;

// Call SDK functions as `any` to avoid branded-type mismatches at runtime.
// The SDK validates inputs as plain strings/bigints internally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (fn: any, ...args: any[]) => fn(...args);

export async function registerAccount(client: any) {
  const zkProver = getUserRegistrationProver(proxiedDeps);
  const register = getUserRegistrationFunction({ client }, { zkProver });
  const result = await register({ confidential: true, anonymous: true });
  console.log("[registerAccount] confirmed:", result);
  const query = getUserAccountQuerierFunction({ client });
  const accountState = await call(query, client.signer.address).catch((e: any) => ({ error: e?.message }));
  console.log("[registerAccount] on-chain account state:", JSON.stringify(accountState, (_, v) => typeof v === "bigint" ? v.toString() : v));
  return result;
}

export async function shieldTokens(client: any, mint: string, amount: bigint) {
  console.log("[shieldTokens] mint:", mint, "amount:", amount);
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  return call(deposit, client.signer.address, mint, amount);
}

export async function unshieldTokens(client: any, mint: string, amount: bigint) {
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
  return call(withdraw, client.signer.address, mint, amount);
}

export async function privateSend(client: any, recipient: string, mint: string, amount: bigint) {
  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver(proxiedDeps);
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({ client }, { zkProver });
  return call(createUtxo, { destinationAddress: recipient, mint, amount });
}

export async function scanUtxos(client: any) {
  const scan = getClaimableUtxoScannerFunction({ client });
  const { received } = await call(scan, 0n, 0n);
  return received;
}

export async function claimUtxos(client: any, utxos: any[]) {
  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver(proxiedDeps);
  const relayer = getUmbraRelayer(RELAYER);
  const deps: any = { zkProver, relayer };
  if (client.fetchBatchMerkleProof) deps.fetchBatchMerkleProof = client.fetchBatchMerkleProof;
  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction({ client }, deps);
  return call(claim, utxos);
}

export async function fetchEncryptedBalances(client: any, mints: string[]): Promise<Map<string, bigint>> {
  const query = getEncryptedBalanceQuerierFunction({ client });
  const results = await call(query, mints);
  const out = new Map<string, bigint>();
  for (const [mint, result] of (results as Map<any, any>).entries()) {
    out.set(mint as string, result.state === "shared" ? BigInt(result.balance) : 0n);
  }
  return out;
}

export async function exportMasterViewingKey(client: any): Promise<string> {
  const derive = getMasterViewingKeyDeriver({ client });
  const key = await derive();
  const keyBig = typeof key === "bigint" ? key : BigInt((key as any).toString());
  return keyBig.toString(16).padStart(64, "0");
}
