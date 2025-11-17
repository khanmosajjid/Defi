import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
    bitgetWallet,
    coinbaseWallet,
    ledgerWallet,
    safepalWallet,
    tokenPocketWallet,
    trustWallet,
    walletConnectWallet,
    metaMaskWallet,
    rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
    bsc,
    bscTestnet
} from 'wagmi/chains';


export const config = getDefaultConfig({
    appName: 'ETHAN DeFi',
    projectId: '9c1d73388cbde2a0cebefd5ded95beaf',
    chains: [bsc, bscTestnet],
    wallets: [
        {
            groupName: 'Popular',
            wallets: [
                metaMaskWallet,
                rainbowWallet,
                coinbaseWallet,
                trustWallet,
                walletConnectWallet,
            ],
        },
        {
            groupName: 'Hardware & Regionals',
            wallets: [
                ledgerWallet,
                safepalWallet,
                bitgetWallet,
                tokenPocketWallet,
            ],
        },
    ],
    ssr: false,
});
