import { useState, useEffect } from "react";
import { useStakingContract } from "@/service/stakingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/common/StatCard";
import {
  Wallet,
  TrendingUp,
  Coins,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";
import { STATS } from "@/lib/constants";

function HistoryPanel() {
  const { fetchStakeHistory, fetchUnstakeHistory } = useStakingContract();
  const [loading, setLoading] = useState(false);
  const [stakeHist, setStakeHist] = useState<
    Array<{ amount: string; timestamp: number }>
  >([]);
  const [unstakeHist, setUnstakeHist] = useState<
    Array<{ amount: string; timestamp: number }>
  >([]);

  const formatAmount = (v?: string) => {
    try {
      if (!v) return "0";
      return (Number(BigInt(v) / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  };
  const formatTime = (ts?: number) => {
    try {
      if (!ts) return "-";
      const d = new Date(ts * 1000);
      return d.toLocaleString();
    } catch {
      return "-";
    }
  };

  async function load() {
    try {
      setLoading(true);
      const [sh, uh] = await Promise.all([
        fetchStakeHistory(),
        fetchUnstakeHistory(),
      ]);
      setStakeHist(Array.isArray(sh) ? sh : []);
      setUnstakeHist(Array.isArray(uh) ? uh : []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">Stake/Unstake history</p>
        <Button
          size="sm"
          variant="outline"
          className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
          onClick={load}
          disabled={loading}
        >
          {loading
            ? "Loading…"
            : stakeHist.length || unstakeHist.length
            ? "Refresh"
            : "Load"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Stakes</p>
          {stakeHist.length === 0 ? (
            <p className="text-xs text-gray-500">No stakes yet</p>
          ) : (
            <ul className="space-y-1">
              {stakeHist.map((e, i) => (
                <li
                  key={`s-${i}`}
                  className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                >
                  <span className="text-gray-200">
                    {formatTime(e.timestamp)}
                  </span>
                  <span className="text-yellow-400">
                    {formatAmount(e.amount)} ETN
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Unstakes</p>
          {unstakeHist.length === 0 ? (
            <p className="text-xs text-gray-500">No unstakes yet</p>
          ) : (
            <ul className="space-y-1">
              {unstakeHist.map((e, i) => (
                <li
                  key={`u-${i}`}
                  className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                >
                  <span className="text-gray-200">
                    {formatTime(e.timestamp)}
                  </span>
                  <span className="text-yellow-400">
                    {formatAmount(e.amount)} ETN
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ROIHistoryPanel() {
  const { fetchROIHistoryFull, fetchLastNROIEvents } = useStakingContract();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    Array<{ amount: string; timestamp: number }>
  >([]);

  const formatAmount = (v?: string) => {
    try {
      if (!v) return "0";
      return (Number(BigInt(v) / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  };
  const formatTime = (ts?: number) => {
    try {
      if (!ts) return "-";
      return new Date(ts * 1000).toLocaleString();
    } catch {
      return "-";
    }
  };

  async function load(useLastN = true) {
    try {
      setLoading(true);
      // Prefer smaller last-N fetch to keep list tidy; fallback to full history
      const data = useLastN
        ? await fetchLastNROIEvents(50)
        : await fetchROIHistoryFull();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">ROI generated history</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => load(true)}
            disabled={loading}
          >
            {loading
              ? "Loading…"
              : items.length
              ? "Refresh (Last 50)"
              : "Load (Last 50)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => load(false)}
            disabled={loading}
          >
            Full
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">No ROI entries yet</p>
      ) : (
        <ul className="space-y-1 max-h-72 overflow-auto pr-1">
          {items.map((e, i) => (
            <li
              key={`roi-${i}`}
              className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
            >
              <span className="text-gray-200">{formatTime(e.timestamp)}</span>
              <span className="text-green-400">
                +{formatAmount(e.amount)} ETN
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const {
    totalStaked,
    tokenBalance,
    userInfo,
    pendingRewardsHuman,
    pendingComputedHuman,
    manualTokenPrice,
    userLevel,
    userRewardPercent,
    refetchTotalStaked,
    userRank,
    userRankName,
    levelInfo,
    rankInfo,
    fetchUserBonds,
    userReport,
    directsWithBalances,
    loadingDirects,
    teamSize,
    fetchUserLevelIncome,
    fetchUserActivity,
    fetchDownlinesByLevel,
  } = useStakingContract();

  // derive user-facing stats from on-chain data
  const formatWeiToETN = (weiStr?: string) => {
    try {
      if (!weiStr) return "0";
      const bn = BigInt(weiStr);
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  };

  const userStats = {
    totalBalance: `${formatWeiToETN(tokenBalance)} ETN`,
    stakedAmount: `${formatWeiToETN(userInfo?.selfStaked)} ETN`,
    pendingRewards: `${pendingRewardsHuman || pendingComputedHuman || "0"} ETN`,
    bondValue: `${formatWeiToETN(totalStaked?.toString?.() ?? "0")} ETN`,
  };

  const totalDirectIncomeHuman = (() => {
    try {
      const sum =
        directsWithBalances?.reduce((acc, direct) => {
          try {
            return acc + BigInt(direct.referralIncome ?? "0");
          } catch {
            return acc;
          }
        }, 0n) ?? 0n;
      return (Number(sum / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  })();

  const activeBondValueHuman = formatWeiToETN(userInfo?.activeBondValue);

  const portfolioChange = {
    daily: "+5.67%",
    weekly: "+12.34%",
    monthly: "+28.91%",
  };

  // Activity state
  const [activity, setActivity] = useState<
    Array<{
      kind: string;
      txHash: string;
      blockNumber: number;
      amount?: string;
      counterparty?: string;
    }>
  >([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  async function loadActivity() {
    try {
      setLoadingActivity(true);
      let items = await fetchUserActivity({
        maxBlocksBack: 500_000,
        includeToken: true,
        includeApprovals: true,
      });
      if (!items || items.length === 0) {
        // fallback: scan deeper
        items = await fetchUserActivity({
          maxBlocksBack: 1_000_000,
          includeToken: true,
          includeApprovals: true,
        });
      }
      setActivity(items);
    } catch (e) {
      // ignore
    } finally {
      setLoadingActivity(false);
    }
  }

  // bonds state & helpers
  const [bonds, setBonds] = useState<
    Array<{
      index: number;
      planId: number;
      amount: string;
      amountHuman: string;
      startAt: number;
      endAt: number;
      withdrawn: boolean;
      duration: string;
      rewardPercent: number;
      status: "Active" | "Matured" | "Withdrawn";
    }>
  >([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchUserBonds();
        if (mounted) setBonds(list);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchUserBonds]);

  const totalBondAmountHuman = (() => {
    try {
      let sum = 0n;
      for (const b of bonds) sum += BigInt(b.amount || "0");
      return (Number(sum / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  })();

  const formatUsd18 = (v?: string) => {
    try {
      if (!v) return "$0.00";
      const bn = BigInt(v);
      const whole = bn / 10n ** 18n;
      const frac = Number(bn % 10n ** 18n) / 1e18;
      const val = Number(whole) + frac;
      return `$${val.toFixed(2)}`;
    } catch {
      return "$0.00";
    }
  };

  // per-level income
  const [levelIncome, setLevelIncome] = useState<string[]>([]);
  useEffect(() => {
    const mounted = true;
    (async () => {
      try {
        const arr = await fetchUserLevelIncome();
        if (mounted) setLevelIncome(arr);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      // no-op cleanup
    };
  }, [fetchUserLevelIncome]);

  // Team by level state
  const [teamLevels, setTeamLevels] = useState<Record<number, string[]>>({});
  const [loadingTeam, setLoadingTeam] = useState(false);
  async function loadTeam() {
    try {
      setLoadingTeam(true);
      const data = await fetchDownlinesByLevel();
      setTeamLevels(data);
    } catch (e) {
      // ignore
    } finally {
      setLoadingTeam(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "STAKE":
        return <ArrowUpRight className="w-4 h-4 text-blue-400" />;
      case "UNSTAKE":
        return <ArrowDownRight className="w-4 h-4 text-red-400" />;
      case "CLAIM":
        return <Gift className="w-4 h-4 text-green-400" />;
      case "BOND_BUY":
      case "BOND_WITHDRAW":
        return <Coins className="w-4 h-4 text-yellow-400" />;
      case "REFERRAL_IN":
        return <ArrowUpRight className="w-4 h-4 text-green-400" />;
      case "REFERRAL_OUT":
        return <ArrowDownRight className="w-4 h-4 text-yellow-400" />;
      case "TOKEN_TRANSFER_IN":
        return <ArrowUpRight className="w-4 h-4 text-purple-400" />;
      case "TOKEN_TRANSFER_OUT":
        return <ArrowDownRight className="w-4 h-4 text-purple-400" />;
      case "TOKEN_APPROVAL":
        return <ArrowUpRight className="w-4 h-4 text-gray-400" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-gray-400" />;
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
            title="Bonds"
            value={`${totalBondAmountHuman} ETN`}
            change={`${bonds.length} position${bonds.length === 1 ? "" : "s"}`}
            changeType="neutral"
            icon={<Coins className="w-5 h-5" />}
            description="Your bond positions"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Team Size"
            value={`${teamSize ?? 0}`}
            change="Across all levels"
            changeType="neutral"
            icon={<Users className="w-5 h-5" />}
            description="Total members in your downline"
          />
          <StatCard
            title="Direct Income"
            value={`${totalDirectIncomeHuman} ETN`}
            change="Earned from directs"
            changeType="positive"
            icon={<Gift className="w-5 h-5" />}
            description="Aggregate payouts from directs"
          />
          <StatCard
            title="Active Bond Value"
            value={`${activeBondValueHuman} ETN`}
            change="Boosts ROI accrual"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Principal + rewards still vesting"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Performance */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Portfolio Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="staking" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger value="staking">Staking</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="bonds">Bonds</TabsTrigger>
                  </TabsList>

                  <TabsContent value="staking" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">ETN Staking Pool</p>
                          <p className="text-sm text-gray-400">
                            APY:{" "}
                            {userRewardPercent && userLevel > 0
                              ? `${userRewardPercent}%`
                              : STATS.currentAPY}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {userStats.stakedAmount}
                          </p>
                          <p className="text-sm text-green-400">
                            +{userStats.pendingRewards} rewards
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-400">Level</p>
                        <p className="text-lg font-semibold">
                          {userLevel && userLevel > 0
                            ? `L${userLevel}`
                            : "None"}
                        </p>
                        {levelInfo && (
                          <div className="mt-2 text-sm text-gray-300 space-y-1">
                            <p>
                              Reward:{" "}
                              <span className="text-yellow-400">
                                {levelInfo.rewardPercent}%
                              </span>
                            </p>
                            <p>
                              Directs required:{" "}
                              <span className="text-yellow-400">
                                {levelInfo.directsReq}
                              </span>
                            </p>
                            <p>
                              Self stake req:{" "}
                              <span className="text-yellow-400">
                                {formatUsd18(levelInfo.selfStakeUsdReq)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-400">Rank</p>
                        <p className="text-lg font-semibold">
                          {userRank && userRank > 0
                            ? userRankName
                              ? `${userRankName} (R${userRank})`
                              : `R${userRank}`
                            : "None"}
                        </p>
                        {rankInfo && (
                          <div className="mt-2 text-sm text-gray-300 space-y-1">
                            {rankInfo.name && (
                              <p>
                                Title:{" "}
                                <span className="text-yellow-400">
                                  {rankInfo.name}
                                </span>
                              </p>
                            )}
                            <p>
                              Company Share:{" "}
                              <span className="text-yellow-400">
                                {rankInfo.companySharePercent}%
                              </span>
                            </p>
                            <p>
                              Directs required:{" "}
                              <span className="text-yellow-400">
                                {rankInfo.directReq}
                              </span>
                            </p>
                            <p>
                              Top-3 income req:{" "}
                              <span className="text-yellow-400">
                                {formatUsd18(rankInfo.incomeReqFromTop3Usd)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-400">Referral</p>
                      <div className="mt-1 text-sm text-gray-300">
                        <p>
                          Referrer:{" "}
                          <span className="text-yellow-400">
                            {userInfo?.referrerShort ?? "No referrer"}
                          </span>
                        </p>
                        <p>
                          Directs:{" "}
                          <span className="text-yellow-400">
                            {userInfo?.directs ?? 0}
                          </span>
                        </p>
                        <p>
                          Total referral income:{" "}
                          <span className="text-yellow-400">
                            {formatWeiToETN(userInfo?.totalReferralIncome)} ETN
                          </span>
                        </p>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-400">
                            Direct Referrals
                          </p>
                          {loadingDirects ? (
                            <span className="text-xs text-yellow-400">
                              Loading…
                            </span>
                          ) : null}
                        </div>
                        {loadingDirects ? (
                          <p className="text-gray-500 text-sm">
                            Fetching direct balances…
                          </p>
                        ) : directsWithBalances &&
                          directsWithBalances.length > 0 ? (
                          <ul className="space-y-2">
                            {directsWithBalances.map((direct) => (
                              <li
                                key={direct.address}
                                className="flex items-start justify-between bg-gray-900/60 px-3 py-2 rounded"
                              >
                                <div>
                                  <p className="text-gray-200">
                                    {direct.address.slice(0, 6)}...
                                    {direct.address.slice(-4)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Staked:
                                    <span className="ml-1 text-yellow-400">
                                      {formatWeiToETN(direct.selfStaked)} ETN
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Pending ROI:
                                    <span className="ml-1 text-green-400">
                                      {formatWeiToETN(direct.pendingRoi)} ETN
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Referral Income:
                                    <span className="ml-1 text-blue-400">
                                      {formatWeiToETN(direct.referralIncome)}{" "}
                                      ETN
                                    </span>
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {direct.level ? (
                                    <span className="text-xs text-gray-400">
                                      Level {direct.level}
                                    </span>
                                  ) : null}
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(
                                          direct.address
                                        );
                                      } catch (e) {
                                        // ignore clipboard errors
                                      }
                                    }}
                                    className="text-xs text-yellow-400 hover:underline"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No directs yet</p>
                        )}
                      </div>
                      {/* Income by Level */}
                      <div className="mt-3">
                        <p className="text-sm text-gray-400 mb-1">
                          Income by level
                        </p>
                        {levelIncome && levelIncome.some((v) => v !== "0") ? (
                          <ul className="space-y-1">
                            {levelIncome.map((v, i) => {
                              if (!v || v === "0") return null;
                              let human = "0";
                              try {
                                human = (
                                  Number(BigInt(v) / 10n ** 15n) / 1000
                                ).toLocaleString();
                              } catch (e) {
                                /* ignore */
                              }
                              return (
                                <li
                                  key={i}
                                  className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                                >
                                  <span className="text-gray-200">
                                    L{i + 1}
                                  </span>
                                  <span className="text-yellow-400">
                                    {human} ETN
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No level income yet</p>
                        )}
                      </div>
                      {/* Team by Level */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-400">Team by level</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                            onClick={loadTeam}
                            disabled={loadingTeam}
                          >
                            {loadingTeam
                              ? "Loading…"
                              : Object.keys(teamLevels).length
                              ? "Refresh"
                              : "Load"}
                          </Button>
                        </div>
                        {Object.keys(teamLevels).length ? (
                          <div className="space-y-2">
                            {Object.entries(teamLevels).map(([lvl, addrs]) => (
                              <div
                                key={lvl}
                                className="bg-gray-900/60 rounded p-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-200">
                                    Level {lvl}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">
                                      {addrs.length} member
                                      {addrs.length === 1 ? "" : "s"}
                                    </span>
                                    <span className="text-xs text-yellow-400">
                                      {(() => {
                                        try {
                                          const idx = Number(lvl) - 1;
                                          const v = levelIncome?.[idx] ?? "0";
                                          if (!v || v === "0") return "0 ETN";
                                          const human = (
                                            Number(BigInt(v) / 10n ** 15n) /
                                            1000
                                          ).toLocaleString();
                                          return `${human} ETN`;
                                        } catch {
                                          return "0 ETN";
                                        }
                                      })()}
                                    </span>
                                  </div>
                                </div>
                                {addrs.length > 0 && (
                                  <ul className="mt-1 grid grid-cols-1 gap-1">
                                    {addrs.map((addr) => (
                                      <li
                                        key={addr}
                                        className="flex items-center justify-between bg-gray-950/50 px-2 py-1 rounded"
                                      >
                                        <span className="text-gray-300">
                                          {addr.slice(0, 6)}...{addr.slice(-4)}
                                        </span>
                                        <button
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(
                                                addr
                                              );
                                            } catch (e) {
                                              /* ignore */
                                            }
                                          }}
                                          className="text-xs text-yellow-400 hover:underline"
                                        >
                                          Copy
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">
                            Load to see your team across unlocked levels
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-400">User report</p>
                      <div className="grid grid-cols-2 gap-3 mt-2 text-sm text-gray-300">
                        <div>
                          <p className="text-gray-400">Total ROI earned</p>
                          <p className="text-yellow-400 font-medium">
                            {formatWeiToETN(userReport?.totalRoiEarned)} ETN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Total withdrawn</p>
                          <p className="text-yellow-400 font-medium">
                            {formatWeiToETN(userReport?.totalWithdrawn)} ETN
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Stake/Unstake History */}
                    <HistoryPanel />
                    {/* ROI Generated History */}
                    <ROIHistoryPanel />
                  </TabsContent>

                  <TabsContent value="bonds" className="space-y-4">
                    <div className="space-y-3">
                      {bonds.length === 0 ? (
                        <div className="p-4 bg-gray-800 rounded-lg text-gray-400">
                          No bonds found
                        </div>
                      ) : (
                        bonds.map((b) => {
                          const remaining = Math.max(
                            0,
                            b.endAt - Math.floor(Date.now() / 1000)
                          );
                          const days = Math.floor(remaining / 86400);
                          return (
                            <div
                              key={b.index}
                              className="flex justify-between items-center p-4 bg-gray-800 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">
                                  Plan #{b.planId} • {b.status}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {days > 0
                                    ? `${days} day${
                                        days === 1 ? "" : "s"
                                      } remaining`
                                    : b.status === "Active"
                                    ? "Matures today"
                                    : b.status}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {b.amountHuman} ETN
                                </p>
                                <p className="text-sm text-yellow-400">
                                  Reward {b.rewardPercent}%
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
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
                <CardTitle className="text-yellow-400">
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!loadingActivity && activity.length === 0 && (
                    <div className="p-3 bg-gray-800 rounded text-gray-400">
                      No activity yet. Click "Load Activity" to fetch recent
                      events.
                    </div>
                  )}
                  {activity.map((tx) => (
                    <div
                      key={tx.txHash}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(tx.kind)}
                        <div>
                          <p className="font-medium capitalize">
                            {tx.kind.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-400">
                            #{tx.blockNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {tx.amount
                            ? `${
                                Number(BigInt(tx.amount) / 10n ** 15n) / 1000
                              } ETN`
                            : "-"}
                        </p>
                        {tx.counterparty && (
                          <p className="text-xs text-gray-400">
                            {tx.counterparty.slice(0, 6)}...
                            {tx.counterparty.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                  onClick={loadActivity}
                  disabled={loadingActivity}
                >
                  {loadingActivity
                    ? "Loading…"
                    : activity.length
                    ? "Refresh Activity"
                    : "Load Activity"}
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
                  <Button
                    variant="outline"
                    className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    Claim Rewards
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    Buy Bonds
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
