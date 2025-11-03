import { useState, useEffect } from "react";
import { useStakingContract } from "@/service/stakingService";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import StatCard from "@/components/common/StatCard";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  Users,
  DollarSign,
  Coins,
  Target,
  CheckCircle,
  Star,
} from "lucide-react";
import { STATS } from "@/lib/constants";

export default function Index() {
  const [currentStat, setCurrentStat] = useState(0);

  const {
    totalStaked,
    manualTokenPrice,
    tokenPriceUsd,
    pendingRewardsHuman,
    pendingComputedHuman,
    userRewardPercent,
  } = useStakingContract();

  const formatWeiToETN = (weiStr?: string) => {
    try {
      if (!weiStr) return "0";
      const bn = BigInt(weiStr);
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  };

  const heroStats = [
    {
      label: "Total Staked",
      value: `${formatWeiToETN(totalStaked?.toString?.() ?? "0")} ETN`,
      prefix: "",
    },
    {
      label: "Token Price (USD)",
      value:
        tokenPriceUsd && tokenPriceUsd !== "0"
          ? Number(BigInt(tokenPriceUsd) / 10n ** 18n).toFixed(4)
          : manualTokenPrice && manualTokenPrice !== "0"
          ? Number(BigInt(manualTokenPrice) / 10n ** 18n).toFixed(4)
          : "N/A",
      prefix: "$",
    },
    {
      label: "Pending Rewards",
      value: `${pendingRewardsHuman || pendingComputedHuman || "0"} ETN`,
      prefix: "",
    },
    {
      label: "Current APY",
      value: userRewardPercent ? `${userRewardPercent}%` : STATS.currentAPY,
      prefix: "",
    },
  ];

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Auto-Compound Staking",
      description:
        "Earn 0.4% every 8 hours with automatic compound interest. Your balance grows exponentially without any action required.",
      highlight: "Up to 7,909% APY",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Reserve & Liquidity Bonds",
      description:
        "Purchase bonds at discounted rates and receive ETN tokens after vesting. Secure treasury backing with algorithmic pricing.",
      highlight: "Up to 8% Discount",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Swap ETN",
      description: "Swap, Vote, Earn: Shape the Future of ETN.",
      highlight: "Community Driven",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Privacy Ecosystem",
      description:
        "Building the world's first privacy and anonymous payment ecosystem based on advanced zk-SNARK technology.",
      highlight: "Privacy First",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to access the ETHAN ecosystem",
    },
    {
      number: "02",
      title: "Stake ETN",
      description: "Stake your ETN tokens and start earning compound interest",
    },
    {
      number: "03",
      title: "Earn Rewards",
      description: "Watch your balance grow automatically every 8 hours",
    },
    {
      number: "04",
      title: "Swap ETN",
      description: "Swap your ETN tokens with other assets seamlessly",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % heroStats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [heroStats.length]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-600/5"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <img
                src="/assets/ethan-logo.jpg"
                alt="ETHAN"
                className="w-24 h-24 mx-auto rounded-full border-4 border-yellow-500 mb-4"
              />
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-4">
                ETHAN
              </h1>
              <p className="text-2xl md:text-3xl text-gray-300 mb-2">
                Web3 Integrated Financial Ecosystem
              </p>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                The DeFi 3.0 protocol based on algorithmic non-stable currency
                ETN makes the world's first private and anonymous payment
                ecosystem
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/stake">
                <Button
                  size="lg"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-lg"
                >
                  Start Staking
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <ConnectButton />
            </div>

            {/* Animated Stats */}
            <div className="bg-black/40 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {heroStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`text-center transition-all duration-500 ${
                      currentStat === index
                        ? "scale-110 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    <p className="text-2xl md:text-3xl font-bold">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How to Participate
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Discover the innovative features that make ETN the future of
              decentralized finance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 group"
              >
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400 group-hover:bg-yellow-500/20 transition-colors">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">
                        {feature.title}
                      </CardTitle>
                      <div className="text-sm text-yellow-400 font-semibold">
                        {feature.highlight}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-2xl text-yellow-400 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2" />
                  Staking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  The compound interest APY mechanism will make your income grow
                  exponentially! Earn 0.4% every 8 hours with automatic compound
                  interest.
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current APY:</span>
                  <span className="text-yellow-400 font-semibold">
                    {STATS.stakingAPY}
                  </span>
                </div>
                <Link to="/stake">
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                    STAKE NOW
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-2xl text-purple-400 flex items-center">
                  <Coins className="w-6 h-6 mr-2" />
                  Bonds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  Purchase bonds at discounted rates and receive ETN tokens
                  after vesting. Support the treasury while earning premium
                  returns.
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Best Discount:</span>
                  <span className="text-purple-400 font-semibold">8.23%</span>
                </div>
                <Link to="/bond">
                  <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
                    BUY BONDS
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              ETN Inner Workings
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Simple steps to start earning with the ETN ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-xl mx-auto group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-yellow-500/50 to-transparent"></div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total ETN Staked"
              value={STATS.totalStaked}
              icon={<Coins className="w-5 h-5" />}
              description="Tokens earning rewards"
            />
            <StatCard
              title="Treasury Balance"
              value={STATS.treasuryBalance}
              icon={<DollarSign className="w-5 h-5" />}
              description="Protocol backing"
            />
            <StatCard
              title="Market Value"
              value={STATS.marketValue}
              icon={<Target className="w-5 h-5" />}
              description="Total market cap"
            />
            <StatCard
              title="Current APY"
              value={STATS.currentAPY}
              change="Compound interest"
              changeType="positive"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Annual yield"
            />
          </div>
        </div>
      </section>

      {/* Privacy Ecosystem */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Building a Privacy Ecosystem
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Based on zk-SNARK technology, we are building the world's first
              privacy public chain platform, establishing a complete blockchain
              privacy ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "Privacy Crypto Wallet",
              "Privacy Hardware Wallet",
              "Privacy Transfer System",
              "Privacy Cross-Chain Function",
              "Privacy Decentralized Exchange",
              "Privacy Stablecoin A",
              "Privacy Smart Contract",
              "Privacy Token ZRC-20",
            ].map((item, index) => (
              <div
                key={index}
                className="text-center p-4 bg-gray-900/50 rounded-lg border border-yellow-500/10 hover:border-yellow-500/30 transition-colors"
              >
                <CheckCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-600/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Start Your DeFi Journey?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of users earning passive income with ETN innovative
              DeFi 3.0 protocol
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/stake">
                <Button
                  size="lg"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4"
                >
                  Start Staking Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              {/* Swap CTA removed */}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
