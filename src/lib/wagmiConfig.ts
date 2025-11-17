import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { createConfig } from 'wagmi';
import {  bsc} from 'wagmi/chains';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    rainbowWallet,
    walletConnectWallet,
    bitgetWallet
} from '@rainbow-me/rainbowkit/wallets';
const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [rainbowWallet, walletConnectWallet,bitgetWallet],
        },
    ],
    {
        appName: 'ETHAN DeFi',
        projectId: '9c1d73388cbde2a0cebefd5ded95beaf',
        
    }
);
export const config = createConfig({
    connectors,
    chains: [bsc],
    ssr: false,
});
