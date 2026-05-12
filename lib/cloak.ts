import { CloakSDK, Connection, Keypair, getAccountSign } from "@cloak-dev/sdk";
import { PublicKey } from "@solana/web3.js";

let _sdk: CloakSDK | null = null;
let _signerAddress: string | null = null;

const CLOAK_CONFIG = {
  mainnet: {
    relayerUrl: "https://api.cloak.ag",
    altAddress: "G1Wc4i6fqiEY1UYn27y6E6RFCBSB1cQ256pAzwrmbiPj",
  },
  devnet: {
    relayerUrl: "https://api.devnet.cloak.ag",
    altAddress: "Dy1kWrcceThLo9ywoMH2MpWTsBe9pxsv3fCcTj3sSDK9",
  },
};

export async function getCloakSdk(address: string, secretKeyHex?: string) {
  if (_sdk && _signerAddress === address) return _sdk;

  const network = (process.env.NEXT_PUBLIC_NETWORK as "mainnet" | "devnet") ?? "mainnet";
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  _sdk = new CloakSDK({
    connection,
    relayerUrl: CLOAK_CONFIG[network].relayerUrl,
    altAddress: CLOAK_CONFIG[network].altAddress,
  });

  if (secretKeyHex) {
    const keypair = Keypair.fromSecretKey(Buffer.from(secretKeyHex, "hex"));
    _sdk.setSigner(keypair);
    await _sdk.initialize();
  }

  _signerAddress = address;
  return _sdk;
}

/**
 * Cloak Private Payroll
 * Fans out a shielded disbursement to multiple recipients.
 */
export async function runPrivatePayroll(
  ownerSecretHex: string,
  payments: { recipient: string; amount: number }[],
  mint?: string
) {
  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerSecretHex, "hex"));
  const sdk = await getCloakSdk(ownerKeypair.publicKey.toBase58(), ownerSecretHex);

  // In a real scenario, we'd use sdk.transfer or a batch disbursement helper.
  // The Cloak SDK supports batch flows.
  console.log(`[Cloak] Starting Private Payroll for ${payments.length} recipients`);
  
  const results = [];
  for (const payment of payments) {
    try {
      // For the hackathon demo, we'll implement individual shielded transfers
      // which Cloak relays privately.
      const result = await (mint 
        ? sdk.withdrawSpl({
            amount: payment.amount,
            recipientAddress: new PublicKey(payment.recipient),
            mintAddress: mint
          })
        : sdk.withdrawSol({
            amount: payment.amount,
            recipientAddress: new PublicKey(payment.recipient),
          }));

      results.push({ 
        recipient: payment.recipient, 
        status: result.success ? "success" : "failed", 
        txHash: result.signature || (result as any).signatures?.[0] || "" 
      });
    } catch (e: any) {
      console.error(`[Cloak] Payment failed for ${payment.recipient}:`, e);
      results.push({ recipient: payment.recipient, status: "failed", error: e.message });
    }
  }

  return results;
}

/**
 * Get viewing key for audit disclosure
 */
export async function getAuditKey(address: string, secretKeyHex: string) {
  const sdk = await getCloakSdk(address, secretKeyHex);
  // Cloak viewing keys allow selective disclosure of history.
  // This is a key requirement for the track.
  // We use getAccountSign to derive a deterministic signature as a viewing key.
  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(secretKeyHex, "hex"));
  const keys = await getAccountSign(ownerKeypair);
  return Buffer.from(keys.signature).toString("hex");
}
