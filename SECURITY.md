# 🛡️ GhostFi Security & Protocol Integrity

GhostFi is built with a "Privacy First, Security Always" philosophy. Our protocol ensures that financial privacy does not come at the cost of fund safety. We adhere to industry-leading standards for encryption, zero-knowledge proofs, and custodial safety.

## 1. Zero-Knowledge Infrastructure
GhostFi leverages the **Umbra Protocol** for its core privacy layer.
- **Groth16 ZK-SNARKs**: We use Groth16 proofs to ensure that transactions are valid without revealing the sender, recipient, or amount.
- **Stealth Addresses**: Every private transfer generates a unique, one-time stealth address for the recipient, breaking the on-chain link.
- **Circuit Integrity**: Our ZK circuits are based on industry-standard primitives used by Umbra and Arcium.

## 2. Key Management & Encryption
For our "Bank via Chat" (WhatsApp/USSD) feature, we use a custodial server-side wallet with rigorous security suitable for enterprise fintech applications:
- **AES-256-GCM Encryption**: All private keys are encrypted using hardware-grade AES-256-GCM with unique initialization vectors (IV) and authentication tags before storage.
- **KMS Integration**: Master encryption keys are managed via hardware-isolated Key Management Systems.
- **Rate Limiting**: To prevent brute-force or spam attacks, all chat interfaces are rate-limited per phone number.

## 3. Financial Integrity & Compliance
- **Verified Fintech Rails**: Our bank payouts and virtual cards are powered by **Raenest**, adhering to strict financial standards.
- **Withdrawal Verification**: Every withdrawal to a bank account undergoes multiple on-chain and off-chain validation steps.
- **Non-Freezable Assets**: Support for stablecoins like **Palm USD (PUSD)** and **USDG** ensures users have uncensorable access to their wealth.

## 4. Audit Readiness
GhostFi is architected for transparency and external verification:
- **Viewing Keys**: Users can generate read-only Viewing Keys for selective disclosure to auditors or tax authorities.
- **Open Protocol**: Our core circuits and contract interactions are open for public verification.
- **Real-Time Security Info**: The `/security` command in our chat bots provides instant transparency on our current security posture.

---
*GhostFi: Building the private financial backbone for the decentralized world.* 🌐🔐

