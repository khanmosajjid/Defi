import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Repeat, BarChart3, Users, Lock, Zap } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Coins,
      title: 'Yield Farming',
      description: 'Earn rewards by providing liquidity to our optimized farming pools with competitive APY rates.',
      gradient: 'from-yellow-400 to-yellow-600'
    },
    {
      icon: Repeat,
      title: 'Token Swapping',
      description: 'Seamlessly swap between different cryptocurrencies with minimal slippage and low fees.',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Lock,
      title: 'Staking Rewards',
      description: 'Stake your ETHAN tokens and earn passive income while supporting network security.',
      gradient: 'from-yellow-600 to-yellow-400'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track your portfolio performance with comprehensive analytics and real-time data.',
      gradient: 'from-orange-400 to-yellow-500'
    },
    {
      icon: Users,
      title: 'Liquidity Pools',
      description: 'Provide liquidity to earn trading fees and additional rewards from our incentive programs.',
      gradient: 'from-yellow-400 to-orange-400'
    },
    {
      icon: Zap,
      title: 'Flash Loans',
      description: 'Access instant, uncollateralized loans for arbitrage and other DeFi strategies.',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            DeFi Features
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Explore the comprehensive suite of decentralized finance tools designed to maximize your crypto potential
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-gray-900/50 border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:transform hover:scale-105 backdrop-blur-sm"
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}>
                  <feature.icon className="h-8 w-8 text-black" />
                </div>
                <CardTitle className="text-xl font-semibold text-white">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-center leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}