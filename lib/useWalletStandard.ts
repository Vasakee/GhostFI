"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Wallet, WalletAccount } from "@wallet-standard/base";

export function useWalletStandardAccount(): { wallet: Wallet; account: WalletAccount } | null {
  const { wallet, publicKey } = useWallet();
  if (!wallet || !publicKey) return null;

  const adapter = wallet.adapter as any;

  const standardWallet: Wallet | undefined =
    adapter._wallet ??
    adapter.wallet ??
    adapter._standardWallet ??
    adapter.standardWallet;

  if (!standardWallet?.accounts?.length) return null;

  const address = publicKey.toBase58();
  // Always read the live account from the wallet's current accounts array
  const account = standardWallet.accounts.find((a: WalletAccount) => a.address === address);
  if (!account) return null;

  return { wallet: standardWallet, account };
}
