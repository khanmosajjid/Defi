import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatCard from '@/components/common/StatCard';
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  Target,
  ArrowRight,
  Info,
  CheckCircle
} from 'lucide-react';

export default function Bond() {
  const [selectedBond, setSelectedBond] = useState<string | null>(null);
  const [bondAmount, setBondAmount] = useState('');

  const bonds = [
    {
      id: '1',
      name: 'ETHAN-USDC Reserve Bond',
      type: 'reserve',
      discountRate: '5.67%',
      price: '$0.943',
      roi: '6.01%',
      vestingTerm: '5 days',
      maxPayout: '1.2%',
      available: true,
      description: 'Bond USDC to receive discounted ETHAN tokens',
      bondToken: 'USDC',
      payoutToken: 'ETHAN'
    },
    {
      id: '2',
      name: 'ETHAN-ETH Liquidity Bond',
      type: 'liquidity',
      discountRate: '8.23%',
      price: '$0.918',
      roi: '8.94%',
      vestingTerm: '5 days',
      maxPayout: '0.8%',
      available: true,
      description: 'Bond LP tokens to receive discounted ETHAN',
      bondToken: 'ETHAN-ETH LP',
      payoutToken: 'ETHAN'
    },
    {
      id: '3',
      name: 'DAI Reserve Bond',
      type: 'reserve',
      discountRate: '3.45%',
      price: '$0.965',
      roi: '3.58%',
      vestingTerm: '5 days',
      maxPayout: '1.5%',
      available: false,
      description: 'Bond DAI to receive discounted ETHAN tokens',
      bondToken: 'DAI',
      payoutToken: 'ETHAN'
    }
  ];

  const userBonds = [
    {
      id: '1',
      bondName: 'ETHAN-USDC Reserve',
      amount: '1,000 ETHAN',
      payout: '1,060 ETHAN',
      vestingProgress: 60,
      timeRemaining: '2 days',
      claimable: '636 ETHAN'
    },
    {
      id: '2',
      bondName: 'ETHAN-ETH Liquidity',
      amount: '500 ETHAN',
      payout: '545 ETHAN',
      vestingProgress: 100,
      timeRemaining: 'Ready',
      claimable: '545 ETHAN'
    }
  ];

  const bondStats = {
    totalBonded: '15,234.56 ETHAN',
    pendingPayout: '2,181 ETHAN',
    totalROI: '+12.34%',
    activeBonds: '2'
  };

  const calculatePayout = (amount: string, discountRate: string) => {
    const numAmount = parseFloat(amount) || 0;
    const discount = parseFloat(discountRate) / 100;
    const payout = numAmount * (1 + discount);
    return payout.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Bonds
          </h1>
          <p className="text-gray-400">
            Purchase bonds at a discount and receive ETHAN tokens after vesting period
          </p>
        </div>

        {/* Bond Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Bonded"
            value={bondStats.totalBonded}
            change={bondStats.totalROI}
            changeType="positive"
            icon={<Coins className="w-5 h-5" />}
            description="All time bonded"
          />
          <StatCard
            title="Pending Payout"
            value={bondStats.pendingPayout}
            change="Vesting"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Awaiting claim"
          />
          <StatCard
            title="Active Bonds"
            value={bondStats.activeBonds}
            change="Currently vesting"
            changeType="neutral"
            icon={<Clock className="w-5 h-5" />}
            description="Bonds in progress"
          />
          <StatCard
            title="Best ROI Available"
            value="8.94%"
            change="ETHAN-ETH LP"
            changeType="positive"
            icon={<Target className="w-5 h-5" />}
            description="Highest return"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Bonds */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Available Bonds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bonds.map((bond) => (
                  <div 
                    key={bond.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedBond === bond.id 
                        ? 'border-yellow-500 bg-yellow-500/5' 
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    } ${!bond.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => bond.available && setSelectedBond(bond.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{bond.name}</h3>
                        <p className="text-sm text-gray-400">{bond.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge 
                          variant={bond.type === 'reserve' ? 'default' : 'secondary'}
                          className={bond.type === 'reserve' ? 'bg-blue-600' : 'bg-purple-600'}
                        >
                          {bond.type}
                        </Badge>
                        {!bond.available && (
                          <Badge variant="outline" className="border-red-500 text-red-400">
                            Sold Out
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Discount</p>
                        <p className="font-semibold text-green-400">{bond.discountRate}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Bond Price</p>
                        <p className="font-semibold">{bond.price}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">ROI</p>
                        <p className="font-semibold text-yellow-400">{bond.roi}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Vesting</p>
                        <p className="font-semibold">{bond.vestingTerm}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bond Purchase Interface */}
                {selectedBond && (
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-yellow-500/20">
                    <h4 className="font-semibold text-yellow-400 mb-4">Purchase Bond</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">
                          Amount ({bonds.find(b => b.id === selectedBond)?.bondToken})
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={bondAmount}
                          onChange={(e) => setBondAmount(e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                        <div className="flex justify-between text-sm text-gray-400 mt-2">
                          <span>Balance: 10,000 USDC</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-yellow-400 hover:text-yellow-300 p-0 h-auto"
                            onClick={() => setBondAmount('10000')}
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      {bondAmount && selectedBond && (
                        <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">You will receive:</span>
                            <span className="text-green-400">
                              {calculatePayout(
                                bondAmount, 
                                bonds.find(b => b.id === selectedBond)?.discountRate || '0'
                              )} ETHAN
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Vesting period:</span>
                            <span className="text-yellow-400">
                              {bonds.find(b => b.id === selectedBond)?.vestingTerm}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">ROI:</span>
                            <span className="text-green-400">
                              {bonds.find(b => b.id === selectedBond)?.roi}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button 
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                        disabled={!bondAmount || parseFloat(bondAmount) <= 0}
                      >
                        Purchase Bond
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Your Bonds */}
          <div>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Your Bonds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userBonds.map((bond) => (
                  <div key={bond.id} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-white">{bond.bondName}</h4>
                        <p className="text-sm text-gray-400">Bonded: {bond.amount}</p>
                      </div>
                      {bond.vestingProgress === 100 && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Payout:</span>
                        <span className="text-white">{bond.payout}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Claimable:</span>
                        <span className="text-green-400">{bond.claimable}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Time remaining:</span>
                        <span className="text-yellow-400">{bond.timeRemaining}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Vesting Progress</span>
                        <span>{bond.vestingProgress}%</span>
                      </div>
                      <Progress value={bond.vestingProgress} className="h-2" />
                    </div>
                    
                    {bond.vestingProgress === 100 ? (
                      <Button className="w-full mt-3 bg-green-600 hover:bg-green-700">
                        Claim {bond.claimable}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full mt-3" disabled>
                        Vesting ({bond.timeRemaining})
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Bond Info */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20 mt-6">
              <CardHeader>
                <CardTitle className="text-yellow-400">How Bonds Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-300">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>Purchase bonds at a discount to market price</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>Bonds vest linearly over 5 days</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>Claim your ETHAN tokens as they vest</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>Higher demand = lower discount rates</p>
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