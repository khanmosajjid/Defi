# ETHAN DeFi Website - Complete Implementation

## Overview
Build a complete DeFi website replicating OriginDeFi with ETHAN branding, golden color scheme, and RainbowKit wallet integration.

## Pages to Implement
1. **Home** - Landing page with hero, features, stats ✓ (existing)
2. **Dashboard** - Portfolio overview, balances, transaction history
3. **Stake** - Staking interface with APY, rewards, compound interest
4. **Bond** - Reserve and liquidity bonds with discount rates
5. **Reward** - Rewards tracking and claiming interface
6. **DAO** - Governance voting and proposals
7. **Invite** - Referral system and invite tracking
8. **Turbine** - Advanced trading features

## Key Features
- RainbowKit wallet integration
- Golden color scheme from ETHAN logo
- Responsive design matching OriginDeFi
- Web3 functionality simulation
- Real-time data displays
- Interactive components

## Components Structure
```
src/
├── components/
│   ├── ui/ (shadcn components)
│   ├── layout/
│   │   ├── Header.tsx (with wallet connect)
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   ├── wallet/
│   │   ├── WalletProvider.tsx
│   │   └── ConnectButton.tsx
│   ├── dashboard/
│   │   ├── PortfolioOverview.tsx
│   │   ├── BalanceCards.tsx
│   │   └── TransactionHistory.tsx
│   ├── staking/
│   │   ├── StakeInterface.tsx
│   │   ├── RewardsDisplay.tsx
│   │   └── StakingPools.tsx
│   ├── bond/
│   │   ├── BondInterface.tsx
│   │   ├── BondTypes.tsx
│   │   └── DiscountRates.tsx
│   ├── dao/
│   │   ├── ProposalList.tsx
│   │   ├── VotingInterface.tsx
│   │   └── GovernanceStats.tsx
│   └── common/
│       ├── StatCard.tsx
│       ├── TokenDisplay.tsx
│       └── LoadingSpinner.tsx
├── pages/
│   ├── Index.tsx (Home)
│   ├── Dashboard.tsx
│   ├── Stake.tsx
│   ├── Bond.tsx
│   ├── Reward.tsx
│   ├── DAO.tsx
│   ├── Invite.tsx
│   └── Turbine.tsx
├── hooks/
│   ├── useWallet.ts
│   ├── useStaking.ts
│   └── useTokenBalance.ts
└── lib/
    ├── constants.ts
    ├── types.ts
    └── utils.ts
```

## Color Palette (Golden Theme)
- Primary Gold: #FFD700
- Dark Gold: #B8860B
- Light Gold: #FFEF94
- Background Dark: #1a1a1a
- Background Light: #2d2d2d
- Text Primary: #ffffff
- Text Secondary: #cccccc
- Accent: #FFA500

## Dependencies to Add
- @rainbow-me/rainbowkit
- wagmi
- viem
- @tanstack/react-query (already included)
- recharts (for charts)
- framer-motion (for animations)

## Implementation Priority
1. Setup RainbowKit and wallet integration
2. Update routing for all pages
3. Create layout components with navigation
4. Implement Dashboard page
5. Implement Stake page
6. Implement Bond page
7. Implement DAO page
8. Implement remaining pages (Reward, Invite, Turbine)
9. Add animations and polish
10. Final testing and optimization