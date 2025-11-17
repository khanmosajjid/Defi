import { useState, useEffect, useCallback } from "react";
import { useStakingContract } from "@/service/stakingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatCard from "@/components/common/StatCard";
import {
  Wallet,
  TrendingUp,
  Coins,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";
import { STATS } from "@/lib/constants";

type MemberDetail = {
  address: string;
  selfStaked: string;
  stakeWithAccrued: string;
  pendingRoi: string;
  level: number;
  referralIncome?: string;
  totalReferralIncome?: string;
  rank?: number;
};
function HistoryPanel() {
  const { fetchStakeHistory, fetchUnstakeHistory } = useStakingContract();
  const PAGE_SIZE = 5;

  type PaginatedHistory = {
    items: Array<{ amount: string; timestamp: number }>;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };

  const [stakePage, setStakePage] = useState(1);
  const [unstakePage, setUnstakePage] = useState(1);
  const [stakes, setStakes] = useState<PaginatedHistory>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [unstakes, setUnstakes] = useState<PaginatedHistory>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [stakeLoading, setStakeLoading] = useState(false);
  const [unstakeLoading, setUnstakeLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

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

  useEffect(() => {
    let cancelled = false;

    const loadStake = async () => {
      setStakeLoading(true);
      try {
        const data = await fetchStakeHistory({
          page: stakePage,
          pageSize: PAGE_SIZE,
        });

        if (!cancelled) {
          const items = Array.isArray(data?.items) ? data.items : [];
          const pageSize =
            typeof data?.pageSize === "number" && data.pageSize > 0
              ? data.pageSize
              : PAGE_SIZE;
          const totalItems =
            typeof data?.totalItems === "number"
              ? data.totalItems
              : items.length;
          const denominator = pageSize > 0 ? pageSize : 1;
          const totalPagesRaw =
            typeof data?.totalPages === "number" && data.totalPages > 0
              ? data.totalPages
              : Math.max(1, Math.ceil(totalItems / denominator));
          const pageRaw =
            typeof data?.page === "number" && data.page > 0
              ? data.page
              : stakePage;
          const page = Math.min(Math.max(1, pageRaw), totalPagesRaw);

          setStakes({
            items,
            page,
            pageSize,
            totalItems,
            totalPages: totalPagesRaw,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Stake history load failed", err);
          setStakes((prev) => ({ ...prev, items: [] }));
        }
      } finally {
        if (!cancelled) setStakeLoading(false);
      }
    };

    void loadStake();
    return () => {
      cancelled = true;
    };
  }, [fetchStakeHistory, stakePage, PAGE_SIZE, refreshNonce]);

  useEffect(() => {
    let cancelled = false;

    const loadUnstake = async () => {
      setUnstakeLoading(true);
      try {
        const data = await fetchUnstakeHistory({
          page: unstakePage,
          pageSize: PAGE_SIZE,
        });

        if (!cancelled) {
          const items = Array.isArray(data?.items) ? data.items : [];
          const pageSize =
            typeof data?.pageSize === "number" && data.pageSize > 0
              ? data.pageSize
              : PAGE_SIZE;
          const totalItems =
            typeof data?.totalItems === "number"
              ? data.totalItems
              : items.length;
          const denominator = pageSize > 0 ? pageSize : 1;
          const totalPagesRaw =
            typeof data?.totalPages === "number" && data.totalPages > 0
              ? data.totalPages
              : Math.max(1, Math.ceil(totalItems / denominator));
          const pageRaw =
            typeof data?.page === "number" && data.page > 0
              ? data.page
              : unstakePage;
          const page = Math.min(Math.max(1, pageRaw), totalPagesRaw);

          setUnstakes({
            items,
            page,
            pageSize,
            totalItems,
            totalPages: totalPagesRaw,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Unstake history load failed", err);
          setUnstakes((prev) => ({ ...prev, items: [] }));
        }
      } finally {
        if (!cancelled) setUnstakeLoading(false);
      }
    };

    void loadUnstake();
    return () => {
      cancelled = true;
    };
  }, [fetchUnstakeHistory, unstakePage, PAGE_SIZE, refreshNonce]);

  const handleRefresh = useCallback(() => {
    setStakePage(1);
    setUnstakePage(1);
    setRefreshNonce((prev) => prev + 1);
  }, []);

  const combinedLoading = stakeLoading || unstakeLoading;

  return (
    <div className="p-4 input-bg rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">Stake/Unstake history</p>
        <Button
          size="sm"
          variant="outline"
          className="card-btn card-btn-sec-bg"
          onClick={handleRefresh}
          disabled={combinedLoading}
        >
          {combinedLoading
            ? "Loading…"
            : stakes.items.length || unstakes.items.length
            ? "Refresh"
            : "Load"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Stakes</p>
          {stakeLoading ? (
            <p className="text-xs text-gray-500">Loading stakes…</p>
          ) : stakes.items.length === 0 ? (
            <p className="text-xs text-gray-500">No stakes yet</p>
          ) : (
            <ul className="space-y-1">
              {stakes.items.map((entry, idx) => (
                <li
                  key={`dash-stake-${idx}`}
                  className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                >
                  <span className="text-gray-200">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="text-yellow-400">
                    {formatAmount(entry.amount)} ETN
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              disabled={stakeLoading || stakes.page <= 1}
              onClick={() => setStakePage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <span>
              Page {stakes.page} of {Math.max(1, stakes.totalPages)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              disabled={
                stakeLoading || stakes.page >= Math.max(1, stakes.totalPages)
              }
              onClick={() => setStakePage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Unstakes</p>
          {unstakeLoading ? (
            <p className="text-xs text-gray-500">Loading unstakes…</p>
          ) : unstakes.items.length === 0 ? (
            <p className="text-xs text-gray-500">No unstakes yet</p>
          ) : (
            <ul className="space-y-1">
              {unstakes.items.map((entry, idx) => (
                <li
                  key={`dash-unstake-${idx}`}
                  className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                >
                  <span className="text-gray-200">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="text-yellow-400">
                    {formatAmount(entry.amount)} ETN
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              disabled={unstakeLoading || unstakes.page <= 1}
              onClick={() => setUnstakePage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <span>
              Page {unstakes.page} of {Math.max(1, unstakes.totalPages)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              disabled={
                unstakeLoading ||
                unstakes.page >= Math.max(1, unstakes.totalPages)
              }
              onClick={() => setUnstakePage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
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

  const load = async (useLastN = true) => {
    try {
      setLoading(true);
      const data = useLastN
        ? await fetchLastNROIEvents(50)
        : await fetchROIHistoryFull();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 input-bg rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">ROI generated history</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="card-btn card-btn-sec-bg"
            onClick={() => void load(true)}
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
            className="card-btn card-btn-sec-bg"
            onClick={() => void load(false)}
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
          {items.map((entry, idx) => (
            <li
              key={`roi-${idx}`}
              className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
            >
              <span className="text-gray-200">
                {formatTime(entry.timestamp)}
              </span>
              <span className="text-green-400">
                +{formatAmount(entry.amount)} ETN
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
    fetchDownlineDetailsByLevel,
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

  const formatLevelIncomeValue = (levelIndex: number) => {
    const raw = levelIncome?.[levelIndex] ?? "0";
    if (!raw || raw === "0") return "0 ETN";
    try {
      const human = (Number(BigInt(raw) / 10n ** 15n) / 1000).toLocaleString();
      return `${human} ETN`;
    } catch {
      return "0 ETN";
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
  const [teamDetailsByLevel, setTeamDetailsByLevel] = useState<
    Record<number, MemberDetail[]>
  >({});
  const [selectedTeamLevel, setSelectedTeamLevel] = useState<number | null>(
    null
  );
  const [loadingTeam, setLoadingTeam] = useState(false);
  const loadTeam = useCallback(async () => {
    try {
      setLoadingTeam(true);
      const detailed = await fetchDownlineDetailsByLevel();
      setTeamDetailsByLevel(detailed);
      const availableLevels = Object.keys(detailed)
        .map((lvl) => Number(lvl))
        .filter((lvl) => (detailed[lvl]?.length ?? 0) > 0)
        .sort((a, b) => a - b);
      setSelectedTeamLevel((prev) => {
        if (prev && detailed[prev]?.length) return prev;
        return availableLevels.length ? availableLevels[0] : null;
      });
    } catch (e) {
      console.error("loadTeam failed", e);
      setTeamDetailsByLevel({});
      setSelectedTeamLevel(null);
    } finally {
      setLoadingTeam(false);
    }
  }, [fetchDownlineDetailsByLevel]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bread-shape">
        <div className="breadcrumb-bg"></div>
      </div>
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
            colorIndex={0}
            aosDelay={50}
          />
          <StatCard
            title="Staked Amount"
            value={userStats.stakedAmount}
            change={`APY ${STATS.currentAPY}`}
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Currently earning rewards"
            colorIndex={1}
            aosDelay={100}
          />
          <StatCard
            title="Pending Rewards"
            value={userStats.pendingRewards}
            change="Ready to claim"
            changeType="positive"
            icon={<Gift className="w-5 h-5" />}
            description="Accumulated rewards"
            colorIndex={2}
            aosDelay={150}
          />
          <StatCard
            title="Bonds"
            value={`${totalBondAmountHuman} ETN`}
            change={`${bonds.length} position${bonds.length === 1 ? "" : "s"}`}
            changeType="neutral"
            icon={<Coins className="w-5 h-5" />}
            description="Your bond positions"
            colorIndex={3}
            aosDelay={200}
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
            colorIndex={4}
            aosDelay={250}
          />
          <StatCard
            title="Direct Income"
            value={`${totalDirectIncomeHuman} ETN`}
            change="Earned from directs"
            changeType="positive"
            icon={<Gift className="w-5 h-5" />}
            description="Aggregate payouts from directs"
            colorIndex={5}
            aosDelay={300}
          />
          <StatCard
            title="Active Bond Value"
            value={`${activeBondValueHuman} ETN`}
            change="Boosts ROI accrual"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Principal + rewards still vesting"
            colorIndex={6}
            aosDelay={350}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Performance */}
          <div className="lg:col-span-2">
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="zoom-in"
              data-aos-delay="150"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Portfolio Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="staking" className="w-full  ">
                  <TabsList className="grid mb-5 w-full grid-cols-3  input-bg">
                    <TabsTrigger value="staking" className="text-light-100 ">
                      Staking
                    </TabsTrigger>
                    <TabsTrigger value="user-report" className="text-light-100">
                      User Report
                    </TabsTrigger>
                    <TabsTrigger value="bonds" className="text-light-100">
                      Bonds
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="staking" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4  input-bg rounded-lg">
                        <div>
                          <p className="font-medium text-white mb-3">
                            ETN Staking Pool
                          </p>
                          <p className="text-sm text-gray-400">
                            APY:{" "}
                            {userRewardPercent && userLevel > 0
                              ? `${userRewardPercent}%`
                              : STATS.currentAPY}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white mb-3">
                            {userStats.stakedAmount}
                          </p>
                          <p className="text-sm text-green-400">
                            +{userStats.pendingRewards} rewards
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="user-report" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 input-bg rounded-lg">
                        <p className="text-sm text-gray-300">Level</p>
                        <p className="text-lg font-semibold text-gray-100">
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
                      <div className="p-4 input-bg rounded-lg">
                        <p className="text-sm text-gray-300">Rank</p>
                        <p className="text-lg font-semibold text-gray-100">
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
                    <div className="p-4 input-bg rounded-lg">
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
                                  <p className="text-xs text-gray-400">
                                    Total Referral:
                                    <span className="ml-1 text-blue-300">
                                      {formatWeiToETN(
                                        direct.totalReferralIncome ?? "0"
                                      )}{" "}
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
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <p className="text-sm text-gray-400">Team by level</p>
                          <div className="flex items-center gap-2">
                            <Select
                              value={
                                selectedTeamLevel
                                  ? String(selectedTeamLevel)
                                  : undefined
                              }
                              onValueChange={(value) =>
                                setSelectedTeamLevel(Number(value))
                              }
                              disabled={
                                loadingTeam ||
                                !Object.keys(teamDetailsByLevel).length
                              }
                            >
                              <SelectTrigger className="w-32 bg-gray-900/60 border-gray-700 text-gray-200">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 text-gray-200">
                                {Object.keys(teamDetailsByLevel)
                                  .map((lvl) => Number(lvl))
                                  .sort((a, b) => a - b)
                                  .map((lvl) => (
                                    <SelectItem key={lvl} value={String(lvl)}>
                                      Level {lvl} (
                                      {teamDetailsByLevel[lvl]?.length ?? 0})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="card-btn card-btn-sec-bg"
                              onClick={loadTeam}
                              disabled={loadingTeam}
                            >
                              {loadingTeam
                                ? "Loading…"
                                : Object.keys(teamDetailsByLevel).length
                                ? "Refresh"
                                : "Load"}
                            </Button>
                          </div>
                        </div>
                        {Object.keys(teamDetailsByLevel).length === 0 ? (
                          <p className="text-gray-500">
                            Load to see your team across unlocked levels
                          </p>
                        ) : selectedTeamLevel ? (
                          <>
                            <p className="text-xs text-gray-500">
                              Level {selectedTeamLevel} income:
                              <span className="ml-1 text-yellow-400">
                                {formatLevelIncomeValue(
                                  Math.max(0, selectedTeamLevel - 1)
                                )}
                              </span>
                            </p>
                            {(teamDetailsByLevel[selectedTeamLevel]?.length ??
                              0) > 0 ? (
                              <ul className="space-y-2 mt-2">
                                {teamDetailsByLevel[selectedTeamLevel]?.map(
                                  (member) => (
                                    <li
                                      key={member.address}
                                      className="flex items-start justify-between bg-gray-900/60 px-3 py-2 rounded"
                                    >
                                      <div className="flex-1">
                                        <p className="text-gray-200">
                                          {member.address.slice(0, 6)}...
                                          {member.address.slice(-4)}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-400 sm:grid-cols-3">
                                          <span>
                                            Stake:
                                            <span className="ml-1 text-yellow-400">
                                              {formatWeiToETN(
                                                member.selfStaked
                                              )}{" "}
                                              ETN
                                            </span>
                                          </span>
                                          <span>
                                            Pending:
                                            <span className="ml-1 text-green-400">
                                              {formatWeiToETN(
                                                member.pendingRoi
                                              )}{" "}
                                              ETN
                                            </span>
                                          </span>
                                          <span>
                                            Total Referral:
                                            <span className="ml-1 text-blue-400">
                                              {formatWeiToETN(
                                                member.totalReferralIncome
                                              )}{" "}
                                              ETN
                                            </span>
                                          </span>
                                          <span>
                                            Level:
                                            <span className="ml-1 text-yellow-400">
                                              L{member.level || 0}
                                            </span>
                                          </span>
                                          <span>
                                            Rank:
                                            <span className="ml-1 text-yellow-300">
                                              {member.rank
                                                ? `R${member.rank}`
                                                : "—"}
                                            </span>
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <button
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(
                                                member.address
                                              );
                                            } catch (e) {
                                              /* ignore */
                                            }
                                          }}
                                          className="text-xs text-yellow-400 hover:underline"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <p className="text-gray-500 mt-2">
                                No members found at this level yet
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500">
                            Select a level to view members
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-4 input-bg rounded-lg">
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
                        <div className="p-4 input-bg rounded-lg text-gray-400">
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
                              className="flex justify-between items-center p-4 input-bg rounded-lg"
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

          <div>
            {/* Quick Actions */}
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20 mt-6"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="card-btn card-btn-bg">Stake ETN</Button>
                  <Button
                    variant="outline"
                    className="card-btn card-btn-sec-bg"
                  >
                    Claim Rewards
                  </Button>
                  <Button
                    variant="outline"
                    className="card-btn card-btn-sec-bg"
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
