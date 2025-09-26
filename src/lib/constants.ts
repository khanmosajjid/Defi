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
  { name: 'REWARD', path: '/reward', icon: '🎁' },
  { name: 'DAO', path: '/dao', icon: '🏛️' },
  { name: 'INVITE', path: '/invite', icon: '👥' },
  { name: 'TURBINE', path: '/turbine', icon: '⚡' },
] as const;

export const STATS = {
  totalStaked: '269,269,262.74',
  treasuryBalance: '$323,476,741',
  marketValue: '$3,410,245,168',
  currentAPY: '1,443.664%',
  stakingAPY: '7,909%',
  rebaseRate: '0.4%',
  rebaseInterval: '8 hours',
} as const;

export const TOKEN_INFO = {
  name: 'ETHAN',
  symbol: 'ETH',
  decimals: 18,
  totalSupply: '1000000000',
} as const;