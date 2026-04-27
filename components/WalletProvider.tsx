"use client";
import { useMemo, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useBankStore } from "@/lib/store";
import { resetClient } from "@/lib/umbra";

function WalletDisconnectWatcher() {
  const { connected } = useWallet();
  useEffect(() => { if (!connected) resetClient(); }, [connected]);
  return null;
}

export function WalletProviderWrapper({ children }: { children: React.ReactNode }) {
  const network = (process.env.NEXT_PUBLIC_NETWORK === "devnet"
    ? WalletAdapterNetwork.Devnet
    : WalletAdapterNetwork.Mainnet) as WalletAdapterNetwork;
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })], [network]);

  const hydrate = useBankStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletDisconnectWatcher />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
