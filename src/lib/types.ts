export interface User {
  address: string;
  balance: string;
  stakedAmount: string;
  rewards: string;
  bondBalance: string;
}

export interface StakingPool {
  id: string;
  name: string;
  apy: string;
  totalStaked: string;
  userStaked: string;
  rewardRate: string;
  lockPeriod: string;
}

export interface Bond {
  id: string;
  type: 'reserve' | 'liquidity';
  name: string;
  discountRate: string;
  price: string;
  roi: string;
  vestingTerm: string;
  maxPayout: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'pending';
  votesFor: string;
  votesAgainst: string;
  totalVotes: string;
  endDate: string;
  quorum: string;
}

export interface Transaction {
  id: string;
  type: 'stake' | 'unstake' | 'bond' | 'claim' | 'vote';
  amount: string;
  hash: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface DashboardStats {
  portfolio: {
    totalValue: string;
    stakedValue: string;
    bondValue: string;
    rewardsValue: string;
  };
  performance: {
    dailyChange: string;
    weeklyChange: string;
    monthlyChange: string;
  };
}