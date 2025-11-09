// ETHAN DeFi Constants
export const COLORS = {
  primary: '#FFD700',
  primaryDark: '#B8860B',
  primaryLight: '#FFEF94',
  backgroundDark: '#1a1a1a',
  backgroundLight: '#2d2d2d',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  accent: '#FFA500',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
} as const;

export const NAVIGATION_ITEMS = [
  { name: 'HOME', path: '/', icon: '🏠' },
  { name: 'DASHBOARD', path: '/dashboard', icon: '📊' },
  { name: 'BOND', path: '/bond', icon: '🔗' },
  { name: 'STAKE', path: '/stake', icon: '🥩' },
  { name: 'REGISTER', path: '/register', icon: '📝' },
  // removed Reward and Swap per product requirements
  // { name: 'INVITE', path: '/invite', icon: '👥' },
  // { name: 'TURBINE', path: '/turbine', icon: '⚡' },
] as const;

export const STATS = {
  totalStaked: '0.0',
  treasuryBalance: '$0.0',
  marketValue: '$0',
  currentAPY: '0',
  stakingAPY: '0',
  rebaseRate: '0',
  rebaseInterval: '0',
} as const;

export const RANK_NAMES = {
  1: 'Visionary',
  2: 'Mentorink',
  3: 'Peak Performer',
  4: 'King Maker',
  5: 'Legacy Ambassador',
} as const;

export const DEFAULT_REFERRER = '0xc607CD122fF8d21fbaECc4305aFE1E357d624137' as const;

export const TOKEN_INFO = {
  name: 'ETHAN',
  symbol: 'ETH',
  decimals: 18,
  totalSupply: '1000000000',
} as const;

//testnet
// export const CONTRACT_ADDRESSES = {
//   stakingPlatform: '0x841e74733375F72d8E5Bf81D3f8D9bb27e4600e6',
//   token: '0x3e88cff91778BAC662C3d912bF575493828Ac9Cf',
// } as const;

//mainnet
export const CONTRACT_ADDRESSES = {
  stakingPlatform: '0x3F5e5dCdC737f751881ef60Ed3bcDF82f3de5466',
  token: '0xE1a2EC79D7b56D13DE7b6dDcfc97004b23A33ff0',
} as const;

//testnet PancakeSwap V2 Addresses
// export const PANCAKESWAP_V2_ADDRESSES = {
//   ROUTER: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap V2 Router on BSC Testnet
//   FACTORY: '0x6725F303b657a9451d8BA641348b6761A6CC7a17', // PancakeSwap V2 Factory on BSC Testnet
// }

//mainnet PancakeSwap V2 Addresses
export const PANCAKESWAP_V2_ADDRESSES = {
  ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2 Router on BSC Mainnet
  FACTORY: '0xCA143Ce32Fe78f1f7019d7d551a6402fC5350c73', // PancakeSwap V2 Factory on BSC Mainnet
}

// ERC20 ABI for token operations
export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  }
] as const

// Official PancakeSwap V2 Router ABI - Exact functions from deployed contract
export const PANCAKESWAP_V2_ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const