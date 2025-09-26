import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/common/StatCard';
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  Zap,
  ArrowRight,
  Info
} from 'lucide-react';
import { STATS } from '@/lib/constants';

export default function Stake() {
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const stakingPools = [
    {
      id: '1',
      name: 'ETHAN Single Stake',
      apy: STATS.currentAPY,
      totalStaked: STATS.totalStaked,
      userStaked: '15,234.56',
      rewardRate: STATS.rebaseRate,
      lockPeriod: 'No lock',
      description: 'Stake ETHAN tokens and earn compound interest every 8 hours'
    },
    {
      id: '2',
      name: 'ETHAN-USDC LP',
      apy: '892.45%',
      totalStaked: '89,456,123.45',
      userStaked: '5,678.90',
      rewardRate: '0.3%',
      lockPeriod: '7 days',
      description: 'Provide liquidity and earn enhanced rewards'
    }
  ];

  const userStats = {
    totalStaked: '20,913.46 ETHAN',
    pendingRewards: '1,234.89 ETHAN',
    nextRebase: '2h 34m',
    totalRewards: '8,567.23 ETHAN'
  };

  const calculateRewards = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const dailyReward = numAmount * 0.012; // 1.2% daily
    return dailyReward.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Staking
          </h1>
          <p className="text-gray-400">
            Stake ETHAN tokens and earn compound interest rewards every 8 hours
          </p>
        </div>

        {/* Staking Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Your Staked Amount"
            value={userStats.totalStaked}
            change={`+${userStats.pendingRewards} pending`}
            changeType="positive"
            icon={<Coins className="w-5 h-5" />}
            description="Currently staked"
          />
          <StatCard
            title="Current APY"
            value={STATS.currentAPY}
            change="Compound interest"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Annual percentage yield"
          />
          <StatCard
            title="Next Rebase"
            value={userStats.nextRebase}
            change={`+${STATS.rebaseRate} every 8h`}
            changeType="positive"
            icon={<Clock className="w-5 h-5" />}
            description="Automatic compound"
          />
          <StatCard
            title="Total Rewards Earned"
            value={userStats.totalRewards}
            change="All time"
            changeType="positive"
            icon={<Zap className="w-5 h-5" />}
            description="Lifetime earnings"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Staking Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Stake ETHAN Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="stake" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                    <TabsTrigger value="stake">Stake</TabsTrigger>
                    <TabsTrigger value="unstake">Unstake</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="stake" className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Amount to Stake</label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white pr-20"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-400 font-medium">
                            ETHAN
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400 mt-2">
                          <span>Balance: 25,000 ETHAN</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-yellow-400 hover:text-yellow-300 p-0 h-auto"
                            onClick={() => setStakeAmount('25000')}
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      {stakeAmount && (
                        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Daily Rewards:</span>
                            <span className="text-green-400">+{calculateRewards(stakeAmount)} ETHAN</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Monthly Rewards:</span>
                            <span className="text-green-400">+{(parseFloat(calculateRewards(stakeAmount)) * 30).toFixed(2)} ETHAN</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">APY:</span>
                            <span className="text-yellow-400">{STATS.currentAPY}</span>
                          </div>
                        </div>
                      )}

                      <Button 
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                        disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                      >
                        Stake ETHAN
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="unstake" className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Amount to Unstake</label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={unstakeAmount}
                            onChange={(e) => setUnstakeAmount(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white pr-20"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-400 font-medium">
                            sETHAN
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400 mt-2">
                          <span>Staked: 20,913.46 sETHAN</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-yellow-400 hover:text-yellow-300 p-0 h-auto"
                            onClick={() => setUnstakeAmount('20913.46')}
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <div className="text-sm">
                            <p className="text-yellow-400 font-medium">Unstaking Notice</p>
                            <p className="text-gray-300 mt-1">
                              Unstaking will forfeit any pending rewards. Consider claiming rewards first.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="outline"
                        className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
                        disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0}
                      >
                        Unstake sETHAN
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Staking Pools & Rewards */}
          <div className="space-y-6">
            {/* Claim Rewards */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Pending Rewards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{userStats.pendingRewards}</p>
                  <p className="text-sm text-gray-400">Available to claim</p>
                </div>
                
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Claim Rewards
                </Button>
                
                <div className="text-xs text-gray-400 text-center">
                  Next rebase in {userStats.nextRebase}
                </div>
              </CardContent>
            </Card>

            {/* Staking Info */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">How Staking Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-300">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    <p>Earn {STATS.rebaseRate} every 8 hours through automatic rebasing</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    <p>Compound interest increases your balance automatically</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    <p>No lock period - unstake anytime</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    <p>Current APY: {STATS.currentAPY}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}