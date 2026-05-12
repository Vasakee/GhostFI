# 👻 GhostFi: Private Banking for the Next Billion

**"Send money privately. No internet required."**

GhostFi is a privacy-first mobile banking layer for Solana. By combining **Umbra Protocol’s ZK-privacy** with the accessibility of **USSD and WhatsApp**, GhostFi allows anyone—even those with a $20 feature phone and no internet—to bank privately on-chain.

## 🌍 The Problem
In emerging markets like Nigeria, **USSD is the standard for banking**, but it is centralized and lacks privacy. Conversely, DeFi is private and borderless but requires high-end smartphones, stable internet, and complex seed phrase management.

## 🛡️ The Solution: GhostFi
GhostFi bridges this gap by providing a custodial, privacy-preserving gateway to Solana. Users interact with a simple text-based interface, while the backend handles complex ZK-proof generation and stealth address resolution.

---

## 🚀 Side-Track Integrations (Colosseum Frontier)

We have strategically integrated the following protocols to drive real-world utility and meet the requirements of the following side tracks:

### 🇳🇬 [Superteam Nigeria x Raenest](https://raenest.com/) ($10k)
*   **Off-Ramps:** Integrated Raenest API to allow users to withdraw private Solana balances directly to **Nigerian Bank Accounts** via USSD.
*   **Virtual Cards:** Users can issue and top-up Raenest Virtual USD cards using their shielded balance.
*   **Code:** [lib/raenest.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/raenest.ts)

### 🛡️ [Umbra Protocol](https://umbraprivacy.com/) ($10k)
*   **The Privacy Engine:** Every transfer in GhostFi uses Umbra’s Stealth Addresses. Funds are shielded into a private pool, breaking the on-chain link between sender and receiver.
*   **Code:** [lib/server-umbra.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/server-umbra.ts)

### 📊 [Dune Analytics](https://dune.com/umbra_privacy/umbra-protocol-on-solana) ($6k)
*   **On-Chain Indexing:** Every transaction includes a Dune-Indexable Memo (e.g., `GhostFi:fund:ussd`). This ensures the protocol’s health and volume can be verified on-chain.
*   **Code:** [lib/analytics.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/analytics.ts)

### 🟢 [Tether / USDT](https://tether.to/) ($10k)
*   **Full USDT Lifecycle:** GhostFi treats USDT as a first-class citizen. Users can fund with USDT, shield it, send it privately, and swap it—all via text commands.
*   **Implementation:** [app/api/webhook/payment/route.ts](https://github.com/Vasakee/GhostFI/blob/main/app/api/webhook/payment/route.ts)

### 🆔 [SNS / Solana Name Service](https://sns.id/) ($5k)
*   **Identity:** Users can send funds to `.sol` domains (e.g., `send 10 ghost.sol`) directly within USSD and WhatsApp.
*   **Code:** [lib/sns.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/sns.ts)

### 🛡️ [Cloak](https://cloak.ag/) ($5k)
*   **Private Payroll:** Integrated Cloak SDK for shielded batch disbursements. Business owners can run payroll privately via USSD without exposing salaries on-chain.
*   **Selective Disclosure:** Supports Cloak **Viewing Keys** for private history disclosure to auditors.
*   **Code:** [lib/cloak.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/cloak.ts)

### 🌴 [Palm USD / PUSD](https://palmsol.com/) ($10k)
*   **Private Stability:** prioritizing PUSD as the default "Ghost Mode" currency, utilizing Jupiter swaps to ensure users hold non-freezable, private stablecoins.
*   **Code:** [lib/pusd.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/pusd.ts)

---

## 🛠️ How it Works

1.  **Fund:** User deposits USDC/USDT via a checkout link (SMS/WhatsApp).
2.  **Shield:** User types `shield 50`. The backend generates a Groth16 ZK-proof and moves funds into a stealth address.
3.  **Transact:** User sends funds privately to a phone number or a `.sol` domain.
4.  **Spend/Off-ramp:** User loads their Raenest card or withdraws to a local bank.

---

## 📂 Technical Implementation Links
*   **USSD Handler:** [app/api/ussd/route.ts](https://github.com/Vasakee/GhostFI/blob/main/app/api/ussd/route.ts)
*   **WhatsApp Handler:** [app/api/whatsapp/route.ts](https://github.com/Vasakee/GhostFI/blob/main/app/api/whatsapp/route.ts)
*   **Privacy engine:** [lib/umbra.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/umbra.ts)
*   **Server-side Prover:** [lib/server-umbra.ts](https://github.com/Vasakee/GhostFI/blob/main/lib/server-umbra.ts)

## ⚙️ Tech Stack
*   **Frontend**: Next.js 14, Tailwind CSS (Analytics Dashboard)
*   **Backend**: Node.js,snarkjs, @umbra-privacy/sdk
*   **Infrastructure**: Africa's Talking (USSD), Twilio (WhatsApp/SMS)
*   **Blockchain**: Solana Web3.js, Jupiter V6, Bonfida (SNS)

---
*GhostFi: Your money. Your business.* 👻
