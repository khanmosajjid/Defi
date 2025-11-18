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
import { http } from 'wagmi';
import { fallback } from 'viem';

const thirdwebApiKey = import.meta.env.VITE_THIRDWEB_API_KEY;
const mainnetRpcOverride = import.meta.env.VITE_BSC_RPC_URL;
const testnetRpcOverride = import.meta.env.VITE_BSC_TESTNET_RPC_URL;
const mainnetRpcFallbacks = import.meta.env.VITE_BSC_RPC_FALLBACK_URLS;
const testnetRpcFallbacks = import.meta.env.VITE_BSC_TESTNET_RPC_FALLBACK_URLS;

const DEFAULT_MAINNET_FALLBACKS = [
    'https://rpc.ankr.com/bsc',
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed1.defibit.io',
];

const DEFAULT_TESTNET_FALLBACKS = [
    'https://rpc.ankr.com/bsc_testnet_chapel',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
];

function buildRpcUrl(defaultUrl: string, override?: string | undefined | null) {
    if (override && override.trim().length > 0) {
        return override.trim();
    }
    return defaultUrl;
}

function splitUrls(input?: string | null) {
    if (!input) return [] as string[];
    return input
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
}

function buildTransport(primary: string, extra: string[], defaults: string[]) {
    const urls = Array.from(new Set([primary, ...extra, ...defaults].filter((url) => url && url.length > 0)));
    if (urls.length === 0) {
        return http(defaults[0]!);
    }
    if (urls.length === 1) {
        return http(urls[0], { fetchOptions: { mode: 'cors' } });
    }
    return fallback(urls.map((url) => http(url, { fetchOptions: { mode: 'cors' } })));
}

const mainnetDefaultPrimary = thirdwebApiKey
    ? `https://bsc.rpc.thirdweb.com/${thirdwebApiKey}`
    : DEFAULT_MAINNET_FALLBACKS[0];

const testnetDefaultPrimary = thirdwebApiKey
    ? `https://bsc-testnet.rpc.thirdweb.com/${thirdwebApiKey}`
    : DEFAULT_TESTNET_FALLBACKS[0];

const mainnetRpcUrl = buildRpcUrl(mainnetDefaultPrimary, mainnetRpcOverride);
const testnetRpcUrl = buildRpcUrl(testnetDefaultPrimary, testnetRpcOverride);

const mainnetTransport = buildTransport(mainnetRpcUrl, splitUrls(mainnetRpcFallbacks), DEFAULT_MAINNET_FALLBACKS);
const testnetTransport = buildTransport(testnetRpcUrl, splitUrls(testnetRpcFallbacks), DEFAULT_TESTNET_FALLBACKS);


export const config = getDefaultConfig({
    appName: 'ETHAN DeFi',
    projectId: '9c1d73388cbde2a0cebefd5ded95beaf',
    chains: [bsc, bscTestnet],
    transports: {
        [bsc.id]: mainnetTransport,
        [bscTestnet.id]: testnetTransport,
    },
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
