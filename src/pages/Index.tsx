import { useState, useEffect, useMemo } from "react";
import { useStakingContract } from "@/service/stakingService";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import StatCard from "@/components/common/StatCard";
import featureShape from "../../public/assets/features_shape.png";
import chooseIcon1 from "../assets/img/shape/choose-icon01.svg";
import chooseIcon2 from "../assets/img/shape/choose-icon02.svg";
import chooseIcon3 from "../assets/img/shape/choose-icon03.svg";

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
import { formatUnits } from "viem";

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

  const totalStakedWei = useMemo(() => {
    try {
      return typeof totalStaked === "bigint"
        ? totalStaked
        : BigInt(totalStaked ?? 0);
    } catch {
      return 0n;
    }
  }, [totalStaked]);

  const formatWeiToETN = (weiStr?: string) => {
    try {
      if (!weiStr) return "0";
      const bn = BigInt(weiStr);
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  };

  const formatUsdPrice = (raw?: string) => {
    if (!raw || raw === "0") return null;
    try {
      const units = formatUnits(BigInt(raw), 18);
      const numeric = Number.parseFloat(units);
      if (Number.isNaN(numeric)) return null;
      return numeric.toFixed(4);
    } catch {
      return null;
    }
  };

  const totalStakedDisplay = useMemo(
    () => `${formatWeiToETN(totalStakedWei.toString())} ETN`,
    [totalStakedWei]
  );

  const heroStats = [
    {
      label: "Total Staked",
      value: totalStakedDisplay,
      prefix: "",
    },
    {
      label: "Token Price (USD)",
      value:
        formatUsdPrice(tokenPriceUsd) ??
        formatUsdPrice(manualTokenPrice) ??
        "N/A",
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
                data-aos="fade-up"
                className="w-24  h-24 mx-auto rounded-full border-4 border-yellow-500 mb-4"
              />
              <h1
                data-aos="fade-up"
                data-aos-delay="100"
                className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-4"
              >
                ETHAN
              </h1>
              <p
                data-aos="fade-up"
                data-aos-delay="200"
                className="text-2xl md:text-3xl text-gray-300 mb-2"
              >
                Web3 Integrated Financial Ecosystem
              </p>
              <p
                data-aos="fade-up"
                data-aos-delay="300"
                className="text-lg text-gray-400 max-w-2xl mx-auto"
              >
                The DeFi 3.0 protocol based on algorithmic non-stable currency
                ETN makes the world's first private and anonymous payment
                ecosystem
              </p>
            </div>

            <div
              data-aos="fade-up"
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link to="/stake">
                <Button size="lg" className="button-animated">
                  Start Staking
                  <span>
                    {" "}
                    <ArrowRight className="w-5 h-5 ml-2 arrow-btn" />
                  </span>
                </Button>
              </Link>
              <ConnectButton />
            </div>

            {/* Animated Stats */}
            <div
              className="bg-black/40 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {heroStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`text-center stats-card transition-all duration-500 ${
                      currentStat === index
                        ? "scale-110 text-yellow-400"
                        : "text-gray-300"
                    }`}
                    //       data-aos="fade-up"
                    // data-aos-delay={index * 150}
                  >
                    <p className="text-2xl md:text-3xl font-bold mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="banner__shape" data-aos="zoom-in">
          <img src={chooseIcon1} className="shape_icon shape_icon-one" alt="" />
          <img src={chooseIcon3} className="shape_icon shape_icon-two" alt="" />
          <img
            src={chooseIcon2}
            className="shape_icon shape_icon-three"
            alt=""
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="feature-area py-20 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="container mx-auto px-4">
          <div
            className="text-center mb-16"
            data-aos="fade-up"
            data-aos-delay="200"
          >
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
                className="custom-card"
                data-aos="zoom-in"
                data-aos-delay={index * 100}
              >
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400 group-hover:bg-yellow-500/20 transition-colors card-icons">
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
            <Card
              className="custom-card-second border-yellow-500/30"
              data-aos="fade-up"
              data-aos-delay="150"
            >
              <CardHeader>
                <CardTitle className="text-2xl text-yellow-400 flex items-center">
                  Staking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400 ">
                  The compound interest APY mechanism will make your income grow
                  exponentially! Earn 0.4% every 8 hours with automatic
                  compound.
                </p>
                <div className="flex justify-between text-sm pb-4">
                  <span className="text-gray-400">Current APY:</span>
                  <span className="text-yellow-400 font-semibold">
                    {STATS.stakingAPY}
                  </span>
                </div>
                <Link to="/stake">
                  <Button className=" custom-btns btn-bg-yellow text-black">
                    STAKE NOW
                  </Button>
                </Link>
              </CardContent>
              <span className="block-icon block-icon--yellow">
                <TrendingUp className="w-6 h-6 icon-clr" />
              </span>
              <span className="screw screw--bl"></span>
              <span className="screw screw--tr"></span>
              <span className="screw screw--big-br"></span>
            </Card>

            <Card
              className="custom-card-second"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <CardHeader>
                <CardTitle className="text-2xl text-purple-400 flex items-center">
                  Bonds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400">
                  Purchase bonds at discounted rates and receive ETN tokens
                  after vesting. Support the treasury while earning premium
                  returns.
                </p>
                <div className="flex justify-between text-sm pb-4">
                  <span className="text-gray-400">Best Discount:</span>
                  <span className="text-purple-400 font-semibold">8.23%</span>
                </div>
                <Link to="/bond">
                  <Button className="custom-btns btn-bg-purple text-white">
                    BUY BONDS
                  </Button>
                </Link>
              </CardContent>
              <span className="block-icon block-icon--purple">
                <Coins className="w-6 h-6  icon-clr" />
              </span>
              <span className="screw screw--bl"></span>
              <span className="screw screw--tr"></span>
              <span className="screw screw--big-br"></span>
            </Card>
          </div>
        </div>
        <div className="bg-section-shape">
          <img src={featureShape} className="feature-shape" alt="" />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 work-area">
        <div className="container mx-auto px-4">
          <div
            className="text-center mb-16"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              ETN Inner Workings
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Simple steps to start earning with the ETN ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="text-center group"
                data-aos="zoom-in"
                data-aos-delay={index * 180}
              >
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
        <div className="bg-section-shape work-bg-shape">
          <img src={featureShape} className="feature-shape" alt="" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 stat-area bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total ETN Staked"
              value={totalStakedDisplay}
              icon={<Coins className="w-5 h-5" />}
              description="Tokens earning rewards"
              colorIndex={0}
              aosDelay={50}
            />
            <StatCard
              title="Treasury Balance"
              value={STATS.treasuryBalance}
              icon={<DollarSign className="w-5 h-5" />}
              description="Protocol backing"
              colorIndex={1}
              aosDelay={100}
            />
            <StatCard
              title="Market Value"
              value={STATS.marketValue}
              icon={<Target className="w-5 h-5" />}
              description="Total market cap"
              colorIndex={2}
              aosDelay={150}
            />
            <StatCard
              title="Current APY"
              value={STATS.currentAPY}
              change="Compound interest"
              changeType="positive"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Annual yield"
              colorIndex={3}
              aosDelay={200}
            />
          </div>
        </div>
      </section>

      {/* Privacy Ecosystem */}
      <section className="py-20 privacy-area">
        <div className="container mx-auto px-4">
          <div
            className="text-center mb-16"
            data-aos="fade-up"
            data-aos-delay="150"
          >
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
            ].map((item, index) => {
              const colors = ["purple", "orange", "green", "blue"];
              const color = colors[index % colors.length];

              return (
                <div
                  key={index}
                  data-aos="zoom-in"
                  data-aos-delay={index * 180}
                  className="text-center p-4 eco-card rounded-lg border border-yellow-500/10 hover:border-yellow-500/30 transition-colors"
                >
                  <CheckCircle className="w-9 h-9 text-yellow-400 mx-auto mb-3" />
                  <p className="text-md text-gray-300">{item}</p>
                  <span
                    className={`stats__dodger stats__dodger--left stats__dodger--${color}`}
                  ></span>
                  <span
                    className={`stats__dodger stats__dodger--right stats__dodger--${color}`}
                  ></span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-section-shape privacy-bg-shape">
          <img src={featureShape} className="feature-shape" alt="" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-600/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl font-bold text-white mb-6"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              Ready to Start Your DeFi Journey?
            </h2>
            <p
              data-aos="fade-up"
              data-aos-delay="150"
              className="text-xl text-gray-400 mb-8"
            >
              Join thousands of users earning passive income with ETN innovative
              DeFi 3.0 protocol
            </p>
            <div
              data-aos="fade-up"
              data-aos-delay="200"
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/stake">
                <Button
                  size="lg"
                  className="custom-btns btn-bg-yellow text-black font-semibold px-8 py-4"
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
