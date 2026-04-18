# GhostFi

A private-by-default banking interface on Solana, powered by the [Umbra SDK](https://sdk.umbraprivacy.com).

> Spend freely. Leave no trace.

---

## The Problem

Every transaction on Solana is publicly readable. Anyone can look up your wallet and see exactly what you hold and every transfer you've ever made. For personal finance, payroll, or business payments — this is unacceptable.

## The Solution

GhostFi gives you a banking interface where your balance is **private by default**. Powered by Umbra's privacy infrastructure:

- Encrypted balances via Arcium MPC
- Anonymous transfers via a UTXO mixer with Groth16 ZK proofs
- Selective compliance disclosure via viewing keys

---

## Features

| Feature | Description |
|---|---|
| 🔒 Private Balance | Shield USDC/USDT/PUSD into an encrypted on-chain balance only you can see |
| 🌴 PUSD Swap | Swap USDC/USDT → Palm USD (non-freezable stablecoin) via Jupiter v6 |
| 📤 Private Send | Send tokens via the GhostFi mixer — no on-chain link between sender and recipient |
| 📥 Receive | Scan for incoming UTXOs and claim them into your private balance |
| 📋 Compliance | Export your viewing key for selective disclosure to auditors or accountants |

---

## How it uses the Umbra SDK

| Action | SDK Function |
|---|---|
| Register account | `getUserRegistrationFunction` |
| Shield tokens | `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` |
| Unshield tokens | `getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction` |
| Private send (mixer) | `getPublicBalanceToReceiverClaimableUtxoCreatorFunction` |
| Scan incoming UTXOs | `getClaimableUtxoScannerFunction` |
| Claim UTXOs | `getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction` |

---

## Tech Stack

- **Next.js 14** (App Router)
- **TailwindCSS**
- **@umbra-privacy/sdk** + **@umbra-privacy/web-zk-prover**
- **@solana/wallet-adapter-react** (Phantom, Solflare)
- **Zustand** for state
- **RPC Fast** — low-latency Solana RPC infrastructure (Frankfurt)
- **Jupiter v6** — PUSD swap routing

---

## Infrastructure

GhostFi runs on [RPC Fast](https://rpcfast.com) for all Solana RPC and WebSocket connections. RPC Fast provides the low-latency, high-throughput infrastructure required for ZK proof generation and UTXO scanning to feel snappy in the browser.

| Concern | Provider |
|---|---|
| Solana RPC | RPC Fast (Frankfurt) |
| WebSocket subscriptions | RPC Fast |
| ZK proving | Browser-side (Umbra web-zk-prover) |
| UTXO indexing | Umbra Indexer API |
| Swap routing | Jupiter v6 API |

---

## Setup & Run

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- A Solana wallet (Phantom or Solflare)

### Install

```bash
pnpm install
```

### Configure

Edit `.env.local`:

```env
# RPC Fast (recommended — low-latency Frankfurt endpoint)
NEXT_PUBLIC_RPC_URL=https://<your-endpoint>.rpcfast.com
NEXT_PUBLIC_RPC_WS_URL=wss://<your-endpoint>.rpcfast.com
NEXT_PUBLIC_NETWORK=mainnet
```

For devnet testing:
```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_RPC_WS_URL=wss://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
pnpm build
pnpm start
```

---

## Usage

1. Connect your Phantom or Solflare wallet
2. Click **Register Account** (one-time, sets up your GhostFi identity on-chain)
3. **Shield** USDC from your public wallet into your private balance
4. **Send** tokens privately to any Solana address via the mixer
5. **Receive** — scan for incoming UTXOs and claim them
6. **Compliance** — export your viewing key for selective disclosure

---

## Project Structure

```
app/
  page.tsx          # Landing / connect wallet
  dashboard/        # Private balance, shield/unshield
  send/             # Private send via mixer
  receive/          # Scan & claim UTXOs
  compliance/       # Viewing key export
lib/
  umbra.ts          # Umbra client singleton
  actions.ts        # All Umbra SDK operations
  store.ts          # Zustand state
components/
  Navbar.tsx
  WalletProvider.tsx
```

---

## License

MIT
