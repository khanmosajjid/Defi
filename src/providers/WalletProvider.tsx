"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmiConfig";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { COLORS } from "@/lib/constants";

const queryClient = new QueryClient();

const customTheme = darkTheme({
  accentColor: COLORS.primary,
  accentColorForeground: COLORS.backgroundDark,
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
