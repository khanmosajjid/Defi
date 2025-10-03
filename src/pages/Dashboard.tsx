import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/common/StatCard';
import { 
  Wallet, 
  TrendingUp, 
  Coins, 
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { STATS } from '@/lib/constants';

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);

  // Mock user data
  const userStats = {
    totalBalance: '$45,234.56',
    stakedAmount: '$32,100.00',
    pendingRewards: '$1,234.89',
    bondValue: '$8,900.00',
  };

  const portfolioChange = {
    daily: '+5.67%',
    weekly: '+12.34%',
    monthly: '+28.91%',
  };

  const recentTransactions = [
    {
      id: '1',
      type: 'stake',
      amount: '1,000 ETN',
      hash: '0x1234...5678',
      timestamp: '2 hours ago',
      status: 'confirmed'
    },
    {
      id: '2',
      type: 'claim',
      amount: '45.67 ETN',
      hash: '0x2345...6789',
      timestamp: '1 day ago',
      status: 'confirmed'
    },
    {
      id: '3',
      type: 'bond',
      amount: '500 ETN',
      hash: '0x3456...7890',
      timestamp: '3 days ago',
      status: 'pending'
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stake': return <ArrowUpRight className="w-4 h-4 text-blue-400" />;
      case 'unstake': return <ArrowDownRight className="w-4 h-4 text-red-400" />;
      case 'claim': return <Gift className="w-4 h-4 text-green-400" />;
      case 'bond': return <Coins className="w-4 h-4 text-yellow-400" />;
      default: return <ArrowUpRight className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400">
            Monitor your portfolio performance and manage your DeFi positions
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Portfolio Value"
            value={userStats.totalBalance}
            change={portfolioChange.daily}
            changeType="positive"
            icon={<Wallet className="w-5 h-5" />}
            description="24h change"
          />
          <StatCard
            title="Staked Amount"
            value={userStats.stakedAmount}
            change={`APY ${STATS.currentAPY}`}
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Currently earning rewards"
          />
          <StatCard
            title="Pending Rewards"
            value={userStats.pendingRewards}
            change="Ready to claim"
            changeType="positive"
            icon={<Gift className="w-5 h-5" />}
            description="Accumulated rewards"
          />
          <StatCard
            title="Bond Value"
            value={userStats.bondValue}
            change="5 days remaining"
            changeType="neutral"
            icon={<Coins className="w-5 h-5" />}
            description="Vesting bonds"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Performance */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="staking">Staking</TabsTrigger>
                    <TabsTrigger value="bonds">Bonds</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-400">24h Change</p>
                        <p className="text-lg font-semibold text-green-400">{portfolioChange.daily}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">7d Change</p>
                        <p className="text-lg font-semibold text-green-400">{portfolioChange.weekly}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">30d Change</p>
                        <p className="text-lg font-semibold text-green-400">{portfolioChange.monthly}</p>
                      </div>
                    </div>
                    <div className="h-48 bg-gray-800 rounded-lg flex items-center justify-center">
                      <p className="text-gray-400">Portfolio Chart Placeholder</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="staking" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">ETN Staking Pool</p>
                          <p className="text-sm text-gray-400">APY: {STATS.currentAPY}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{userStats.stakedAmount}</p>
                          <p className="text-sm text-green-400">+{userStats.pendingRewards} rewards</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="bonds" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">ETN-USDC Bond</p>
                          <p className="text-sm text-gray-400">5 days remaining</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{userStats.bondValue}</p>
                          <p className="text-sm text-yellow-400">Vesting</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <div>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <p className="font-medium capitalize">{tx.type}</p>
                          <p className="text-sm text-gray-400">{tx.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{tx.amount}</p>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(tx.status)}
                          <span className="text-xs text-gray-400 capitalize">{tx.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                >
                  View All Transactions
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20 mt-6">
              <CardHeader>
                <CardTitle className="text-yellow-400">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Stake ETN
                  </Button>
                  <Button variant="outline" className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10">
                    Claim Rewards
                  </Button>
                  <Button variant="outline" className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10">
                    Buy Bonds
                  </Button>
                  <Button variant="outline" className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10">
                    Vote in DAO
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}