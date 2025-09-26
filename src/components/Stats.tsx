import { useEffect, useState } from 'react';

export default function Stats() {
  const [counters, setCounters] = useState({
    tvl: 0,
    users: 0,
    volume: 0,
    apy: 0
  });

  const finalStats = {
    tvl: 2500000000, // $2.5B
    users: 150000,   // 150K
    volume: 8500000000, // $8.5B
    apy: 45.7        // 45.7%
  };

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setCounters({
        tvl: Math.floor(finalStats.tvl * progress),
        users: Math.floor(finalStats.users * progress),
        volume: Math.floor(finalStats.volume * progress),
        apy: Math.floor(finalStats.apy * progress * 10) / 10
      });

      if (step >= steps) {
        clearInterval(timer);
        setCounters(finalStats);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  const stats = [
    {
      label: 'Total Value Locked',
      value: formatNumber(counters.tvl),
      description: 'Assets secured in protocol'
    },
    {
      label: 'Active Users',
      value: formatNumber(counters.users),
      description: 'Monthly active participants'
    },
    {
      label: 'Trading Volume',
      value: formatNumber(counters.volume),
      description: '24h trading volume'
    },
    {
      label: 'Average APY',
      value: `${counters.apy}%`,
      description: 'Yield farming returns'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Protocol Statistics
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Real-time metrics showcasing the growth and adoption of the ETHAN ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-8 bg-gray-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all duration-300 hover:transform hover:scale-105"
            >
              <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xl font-semibold text-white mb-2">
                {stat.label}
              </div>
              <div className="text-gray-400">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Join the ETHAN Revolution
            </h3>
            <p className="text-gray-300 text-lg">
              Be part of the fastest-growing DeFi ecosystem. Start earning, trading, and building your financial future today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}