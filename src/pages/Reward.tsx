import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/common/StatCard';
import { 
  Gift, 
  TrendingUp, 
  Clock, 
  Zap,
  ArrowRight,
  CheckCircle,
  Calendar
} from 'lucide-react';

export default function Reward() {
  const rewardStats = {
    totalEarned: '8,567.23 ETN',
    pendingRewards: '1,234.89 ETN',
    nextRebase: '2h 34m',
    claimableNow: '1,089.45 ETN'
  };

  const rewardHistory = [
    {
      id: '1',
      type: 'staking',
      amount: '45.67 ETN',
      timestamp: '2 hours ago',
      status: 'claimed',
      source: 'Staking Rewards'
    },
    {
      id: '2',
      type: 'bond',
      amount: '123.45 ETN',
      timestamp: '1 day ago',
      status: 'claimed',
      source: 'Bond Maturity'
    },
    {
      id: '3',
      type: 'staking',
      amount: '42.33 ETN',
      timestamp: '1 day ago',
      status: 'claimed',
      source: 'Staking Rewards'
    },
    {
      id: '4',
      type: 'governance',
      amount: '10.00 ETN',
      timestamp: '3 days ago',
      status: 'claimed',
      source: 'Governance Participation'
    },
    {
      id: '5',
      type: 'staking',
      amount: '38.91 ETN',
      timestamp: '3 days ago',
      status: 'claimed',
      source: 'Staking Rewards'
    }
  ];

  const upcomingRewards = [
    {
      id: '1',
      type: 'staking',
      amount: '47.23 ETN',
      timeUntil: '2h 34m',
      source: 'Next Rebase'
    },
    {
      id: '2',
      type: 'bond',
      amount: '234.56 ETN',
      timeUntil: '1 day 12h',
      source: 'ETN-USDC Bond'
    },
    {
      id: '3',
      type: 'bond',
      amount: '345.67 ETN',
      timeUntil: '3 days 8h',
      source: 'ETN-ETH LP Bond'
    }
  ];

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'staking':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'bond':
        return <Gift className="w-4 h-4 text-purple-400" />;
      case 'governance':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Zap className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getRewardBadge = (type: string) => {
    switch (type) {
      case 'staking':
        return <Badge className="bg-blue-600">Staking</Badge>;
      case 'bond':
        return <Badge className="bg-purple-600">Bond</Badge>;
      case 'governance':
        return <Badge className="bg-green-600">Governance</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Rewards
          </h1>
          <p className="text-gray-400">
            Track and claim your ETN rewards from staking, bonds, and governance
          </p>
        </div>

        {/* Reward Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Earned"
            value={rewardStats.totalEarned}
            change="All time rewards"
            changeType="positive"
            icon={<Gift className="w-5 h-5" />}
            description="Lifetime earnings"
          />
          <StatCard
            title="Pending Rewards"
            value={rewardStats.pendingRewards}
            change="Accumulating"
            changeType="positive"
            icon={<Clock className="w-5 h-5" />}
            description="Not yet claimable"
          />
          <StatCard
            title="Claimable Now"
            value={rewardStats.claimableNow}
            change="Ready to claim"
            changeType="positive"
            icon={<CheckCircle className="w-5 h-5" />}
            description="Available immediately"
          />
          <StatCard
            title="Next Rebase"
            value={rewardStats.nextRebase}
            change="Auto-compound"
            changeType="positive"
            icon={<Zap className="w-5 h-5" />}
            description="Staking rewards"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reward Management */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Reward Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="claimable" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger value="claimable">Claimable</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="claimable" className="space-y-6 mt-6">
                    {/* Claim All Section */}
                    <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">Available to Claim</h3>
                          <p className="text-gray-400">Total claimable rewards across all sources</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-yellow-400">{rewardStats.claimableNow}</p>
                          <p className="text-sm text-gray-400">≈ $2,178.90</p>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-lg py-3">
                        Claim All Rewards
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>

                    {/* Individual Claimable Rewards */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Individual Rewards</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="font-medium text-white">Staking Rewards</p>
                              <p className="text-sm text-gray-400">Auto-compound in {rewardStats.nextRebase}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white">789.45 ETN</p>
                            <Button size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700">
                              Claim
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Gift className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="font-medium text-white">Bond Rewards</p>
                              <p className="text-sm text-gray-400">Fully vested bonds</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white">300.00 ETN</p>
                            <Button size="sm" className="mt-1 bg-purple-600 hover:bg-purple-700">
                              Claim
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {rewardHistory.map((reward) => (
                        <div key={reward.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getRewardIcon(reward.type)}
                            <div>
                              <p className="font-medium text-white">{reward.source}</p>
                              <p className="text-sm text-gray-400">{reward.timestamp}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-400">+{reward.amount}</p>
                            {getRewardBadge(reward.type)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      Load More History
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="upcoming" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {upcomingRewards.map((reward) => (
                        <div key={reward.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getRewardIcon(reward.type)}
                            <div>
                              <p className="font-medium text-white">{reward.source}</p>
                              <p className="text-sm text-gray-400">Available in {reward.timeUntil}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-yellow-400">{reward.amount}</p>
                            <div className="flex items-center text-xs text-gray-400">
                              <Clock className="w-3 h-3 mr-1" />
                              {reward.timeUntil}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Reward Summary & Settings */}
          <div className="space-y-6">
            {/* Reward Breakdown */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Reward Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Staking</span>
                    </div>
                    <span className="text-sm font-medium text-white">7,234.56 ETN</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Gift className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">Bonds</span>
                    </div>
                    <span className="text-sm font-medium text-white">1,322.67 ETN</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-300">Governance</span>
                    </div>
                    <span className="text-sm font-medium text-white">10.00 ETN</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">Total Earned</span>
                    <span className="font-semibold text-yellow-400">{rewardStats.totalEarned}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Compound Settings */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Auto-Compound</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-white">Staking Rewards</p>
                    <p className="text-sm text-gray-400">Automatically compound every rebase</p>
                  </div>
                  <div className="w-12 h-6 bg-yellow-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  <p>• Next rebase: {rewardStats.nextRebase}</p>
                  <p>• Rebase rate: 0.4% every 8 hours</p>
                  <p>• Current APY: 1,443.664%</p>
                </div>
              </CardContent>
            </Card>

            {/* Reward Calendar */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Reward Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Today:</span>
                    <span className="text-green-400">+89.45 ETN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">This week:</span>
                    <span className="text-green-400">+634.23 ETN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">This month:</span>
                    <span className="text-green-400">+2,456.78 ETN</span>
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