import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {  
    bsc
} from 'wagmi/chains';


export const config = getDefaultConfig({
    appName: 'ETHAN DeFi',
    projectId: '9c1d73388cbde2a0cebefd5ded95beaf',
    chains: [ bsc],
    ssr: false,
});
