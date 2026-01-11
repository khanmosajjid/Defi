import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useStakingContract } from "@/service/stakingService";
import { useAccount, useChainId } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/common/StatCard";
import {
  Coins,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { STATS, CONTRACT_ADDRESSES, DEFAULT_REFERRER } from "@/lib/constants";
import { useTokenSwap } from "@/hooks/useTokenSwap";
import { formatUnits, parseUnits } from "viem";
import { readStoredWalletAddress } from "@/lib/utils";

const BURN_FACTOR_NUM = 99n;
const BURN_FACTOR_DEN = 100n;

const trimTrailingZeros = (value: string) => {
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/(\.\d*?)0+$/u, "$1").replace(/\.$/u, "");
  return trimmed.length > 0 ? trimmed : "0";
};

const applyBurnDeduction = (
  value: string | null | undefined,
  decimals = 18
) => {
  try {
    if (!value) return "0";
    const amountWei = parseUnits(value, decimals);
    if (amountWei <= 0n) return "0";
    const netWei = (amountWei * BURN_FACTOR_NUM) / BURN_FACTOR_DEN;
    if (netWei <= 0n) return "0";
    return trimTrailingZeros(formatUnits(netWei, decimals));
  } catch {
    return "0";
  }
};

export default function Stake() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [referralAddress, setReferralAddress] =
    useState<string>(DEFAULT_REFERRER);
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quotedETHAN, setQuotedETHAN] = useState("0");
  const [storedWallet, setStoredWallet] = useState<string | null>(null);
  const [walletCheckStatus, setWalletCheckStatus] = useState<
    "idle" | "checking" | "error"
  >("checking");

  const {
    stake: stakeTx,
    tokenBalance,
    userInfo,
    userReport,
    refetchUserInfo,
    refetchPendingRewards,
    pendingRewards: pendingRewardsRaw,
    pendingComputed,
    userLevel,
    userRewardPercent,
    unstake: unstakeTx,
    fetchROIHistoryFull,
    fetchLastNROIEvents,
    fetchUserLevelIncome,
    refetchTokenBalance,
  } = useStakingContract();

  console.log("User Info:", userInfo);

  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { getQuote, executeSwap, isLoading: swapLoading } = useTokenSwap();
  const [etnSellAmount, setEtnSellAmount] = useState("");
  const [quotedUSDT, setQuotedUSDT] = useState("0");
  const [isSellProcessing, setIsSellProcessing] = useState(false);
  const netQuotedETHAN = useMemo(
    () => applyBurnDeduction(quotedETHAN),
    [quotedETHAN]
  );
  const netQuotedUSDT = useMemo(
    () => applyBurnDeduction(quotedUSDT, 18),
    [quotedUSDT]
  );

  // referral param from URL (if present)
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);
  const REFERRAL_STORAGE_KEY = "ethan:lastReferralAddress";

  const tokens = {
    // USDT: "0xbD740AFeAa78f104E5E0f6edb0e23e96ED9fEfC8", //testnet
    USDT: "0x55d398326f99059fF775485246999027B3197955", //mainnet
    ETHAN: CONTRACT_ADDRESSES.token,
  };

  useEffect(() => {
    let cancelled = false;

    setWalletCheckStatus("checking");

    readStoredWalletAddress()
      .then((value) => {
        if (cancelled) return;
        setStoredWallet(value);
        setWalletCheckStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Unable to verify stored wallet", err);
        setStoredWallet(null);
        setWalletCheckStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const formatWeiToEtn = (value?: string) => {
    try {
      if (!value) return "0";
      const bn = BigInt(value);
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  };

  const parseBigIntSafe = (value: unknown): bigint | null => {
    try {
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(Math.floor(value));
      if (typeof value === "string") return BigInt(value);
      if (value && typeof value === "object" && "toString" in value) {
        const str = (value as { toString: () => string }).toString();
        if (str) return BigInt(str);
      }
    } catch {
      return null;
    }
    return null;
  };

  // Auto quote ETHAN when user types USDT amount
  useEffect(() => {
    const fetchQuote = async () => {
      if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
        setQuotedETHAN("0");
        return;
      }
      try {
        const quote = await getQuote(stakeAmount, tokens.USDT, tokens.ETHAN);
        setQuotedETHAN(quote);
      } catch (err) {
        console.error("Quote fetch error:", err);
        setQuotedETHAN("0");
      }
    };
    fetchQuote();
  }, [stakeAmount, getQuote, tokens.USDT, tokens.ETHAN]);

  // Auto quote USDT when user types ETN amount to sell
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      if (!etnSellAmount || parseFloat(etnSellAmount) <= 0) {
        if (!cancelled) setQuotedUSDT("0");
        return;
      }
      try {
        const quote = await getQuote(etnSellAmount, tokens.ETHAN, tokens.USDT);
        if (!cancelled) setQuotedUSDT(quote);
      } catch (err) {
        console.error("Sell quote fetch failed", err);
        if (!cancelled) setQuotedUSDT("0");
      }
    };

    void fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [etnSellAmount, getQuote, tokens.ETHAN, tokens.USDT]);

  const userStaked = userInfo?.selfStaked ?? "0";
  const userStakedHuman = formatWeiToEtn(userStaked);
  const pendingRewards =
    pendingRewardsRaw && pendingRewardsRaw !== "0"
      ? pendingRewardsRaw
      : pendingComputed || "0";
  const pendingRewardsHuman = formatWeiToEtn(pendingRewards);
  const directs = userInfo?.directs ?? 0;
  const totalIncome = (() => {
    try {
      const roi = BigInt(userReport?.totalRoiEarned ?? "0");
      const lvl = BigInt(userReport?.totalLevelRewardEarned ?? "0");
      const ref = BigInt(userReport?.totalReferralIncome ?? "0");
      return (roi + lvl + ref).toString();
    } catch {
      return "0";
    }
  })();
  const totalIncomeHuman = (() => {
    try {
      const bn = BigInt(totalIncome);
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  })();
  const referrerAddr = userInfo?.referrerShort ?? "No referrer";

  // Determine if a referrer is registered on-chain (safe string coercion)
  const hasRegisteredReferrer = (() => {
    const r = userInfo?.referrer;
    if (!r) return false;
    try {
      const s =
        typeof r === "string" ? r.toLowerCase() : String(r).toLowerCase();
      return s !== "0x0000000000000000000000000000000000000000";
    } catch {
      return false;
    }
  })();
  const networkLabel = chainId ?? "network";
  const referralLocked = Boolean(refFromUrl && !hasRegisteredReferrer);
  const shouldPromptWalletRegistration =
    walletCheckStatus !== "checking" && !storedWallet;

  // parse referral from URL on first load
  useEffect(() => {
    try {
      const qp = new URLSearchParams(window.location.search);
      const r = qp.get("ref");
      if (r && typeof r === "string") {
        const trimmed = r.trim();
        if (trimmed.startsWith("0x")) {
          setRefFromUrl(trimmed);
          localStorage.setItem(REFERRAL_STORAGE_KEY, trimmed);
          return;
        }
      }

      const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (stored && stored.startsWith("0x")) {
        setRefFromUrl(stored);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!refFromUrl || !refFromUrl.startsWith("0x")) return;
    try {
      localStorage.setItem(REFERRAL_STORAGE_KEY, refFromUrl);
    } catch {
      // ignore storage errors
    }
  }, [refFromUrl]);

  // keep referral input synchronized with URL/default unless a referrer is registered
  useEffect(() => {
    if (hasRegisteredReferrer) {
      setReferralAddress("");
      return;
    }

    if (refFromUrl) {
      setReferralAddress(refFromUrl);
      return;
    }

    setReferralAddress((prev) =>
      prev && prev.trim() ? prev : DEFAULT_REFERRER
    );
  }, [refFromUrl, hasRegisteredReferrer]);

  const calculateRewards = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const dailyReward = numAmount * 0.012;
    return dailyReward.toFixed(2);
  };

  const handleSwapAndStake = async () => {
    if (!connectedAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid stake amount");
      return;
    }

    const netQuotedFloat = parseFloat(netQuotedETHAN || "0");
    if (
      !netQuotedETHAN ||
      Number.isNaN(netQuotedFloat) ||
      netQuotedFloat <= 0
    ) {
      toast.error("Unable to determine ETN output after burn. Try again.");
      return;
    }

    // If the user already has a registered referrer on-chain, use that address.
    // Otherwise prefer the input referralAddress (if valid), then fall back to connected address.
    let ref = "";
    if (hasRegisteredReferrer && userInfo?.referrer) {
      ref = userInfo.referrer as string;
    } else {
      ref = referralAddress?.trim() ?? "";
      if (!ref || !ref.startsWith("0x")) ref = DEFAULT_REFERRER;
    }

    setIsProcessing(true);
    try {
      const balanceBig = BigInt(tokenBalance || "0");
      let quotedWei: bigint = 0n;
      try {
        quotedWei = parseUnits(quotedETHAN || "0", 18);
      } catch {
        quotedWei = 0n;
      }
      const netQuotedWei =
        quotedWei > 0n ? (quotedWei * BURN_FACTOR_NUM) / BURN_FACTOR_DEN : 0n;

      if (netQuotedWei === 0n) {
        toast.error("Swap quote unavailable. Try again later.");
        return;
      }

      if (balanceBig >= netQuotedWei) {
        toast.success("Sufficient token balance found — skipping swap");
        const stakeToast = toast.loading("Staking your tokens...");
        try {
          const whole = netQuotedWei / 10n ** 18n;
          const frac = netQuotedWei % 10n ** 18n;
          const tokenStr = `${whole.toString()}.${frac
            .toString()
            .padStart(18, "0")}`;

          await stakeTx(tokenStr, ref);
          toast.success("Stake successful", { id: stakeToast });
        } catch (e) {
          console.error("Stake failed", e);
          toast.error("Stake failed", { id: stakeToast });
        }
      } else {
        const swapToastId = toast.loading(
          `Swapping ${stakeAmount} USDT → ETHAN on ${networkLabel}...`
        );

        const txHash = await executeSwap(
          stakeAmount,
          netQuotedETHAN,
          tokens.USDT,
          tokens.ETHAN,
          2
        );

        toast.dismiss(swapToastId);

        if (!txHash) {
          toast.error("Swap failed — staking aborted");
          return;
        }

        toast.success("Swap completed — checking received tokens");

        let walletBalanceWei = parseBigIntSafe(tokenBalance) ?? 0n;

        if (typeof refetchTokenBalance === "function") {
          try {
            const refreshed = await refetchTokenBalance();
            const refreshedData = (refreshed as { data?: unknown })?.data;
            const parsed = parseBigIntSafe(refreshedData);
            if (parsed !== null) {
              walletBalanceWei = parsed;
            }
          } catch (balanceErr) {
            console.error(
              "Failed to refetch ETN balance post-swap",
              balanceErr
            );
          }
        }

        let stakeWei = netQuotedWei;

        if (
          stakeWei > 0n &&
          walletBalanceWei > 0n &&
          stakeWei > walletBalanceWei
        ) {
          stakeWei = walletBalanceWei;
        }

        if (stakeWei <= 0n || walletBalanceWei <= 0n) {
          toast.error("Insufficient ETN balance after swap");
          return;
        }

        const stakeToast = toast.loading("Staking...");
        try {
          const whole = stakeWei / 10n ** 18n;
          const frac = stakeWei % 10n ** 18n;
          const tokenStr = `${whole.toString()}.${frac
            .toString()
            .padStart(18, "0")}`;
          await stakeTx(tokenStr, ref);
          toast.success("Stake successful", { id: stakeToast });
        } catch (e) {
          console.error("Stake failed", e);
          toast.error("Stake failed", { id: stakeToast });
        }
      }

      await refetchUserInfo();
      await refetchPendingRewards();
      setStakeAmount("");
      setReferralAddress(hasRegisteredReferrer ? "" : DEFAULT_REFERRER);
    } catch (err) {
      console.error("Swap & stake failed:", err);
      toast.error("Swap & stake failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bread-shape">
        <div className="breadcrumb-bg"></div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Staking
          </h1>
          {/* <p className="text-gray-400">
            Stake ETN tokens and earn compound interest rewards every 8 hours
          </p> */}
        </div>

        {shouldPromptWalletRegistration && (
          <div className="mb-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-300" />
                <div>
                  <p className="font-semibold text-yellow-300">
                    Register your wallet
                  </p>
                  <p className="text-sm text-gray-300">
                    We could not find a stored wallet address. Register before
                    staking so your access persists across sessions.
                  </p>
                </div>
              </div>
              <Link to="/register" className="sm:ml-auto w-full sm:w-auto">
                <Button className="w-full custom-btns btn-bg-yellow text-black font-semibold">
                  Register Wallet
                </Button>
              </Link>
            </div>
            {walletCheckStatus === "error" && (
              <p className="mt-3 text-xs text-red-400">
                Browser storage could not be read. Please register again to
                refresh your wallet information.
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Your Staked Amount"
            value={`${userStakedHuman} ETN`}
            change={`+${pendingRewardsHuman} pending`}
            changeType="positive"
            icon={<Coins className="w-5 h-5" />}
            description="Currently staked"
            colorIndex={10}
            aosDelay={50}
          />
          <StatCard
            title="Current APY"
            value={
              userRewardPercent && userLevel > 0
                ? `${userRewardPercent}%`
                : STATS.currentAPY
            }
            change="Compound interest"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Annual percentage yield"
            colorIndex={11}
            aosDelay={100}
          />
          <StatCard
            title="Level"
            value={userLevel && userLevel > 0 ? `L${userLevel}` : "None"}
            change="Your level"
            changeType="neutral"
            icon={<Zap className="w-5 h-5" />}
            description="User level based on stake & directs"
            colorIndex={12}
            aosDelay={150}
          />
          <StatCard
            title="Directs"
            value={`${directs}`}
            change="Your direct referrals"
            changeType="neutral"
            icon={<Clock className="w-5 h-5" />}
            description="Number of directs"
            colorIndex={13}
            aosDelay={200}
          />
          <StatCard
            title="All Income"
            value={`${totalIncomeHuman} ETN`}
            change="Rewards + referral income"
            changeType="positive"
            icon={<Coins className="w-5 h-5" />}
            description="Lifetime earned"
            colorIndex={14}
            aosDelay={250}
          />
          <StatCard
            title="ROI Income"
            value={`${(() => {
              try {
                const bn = BigInt(userReport?.totalRoiEarned ?? "0");
                return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
              } catch {
                return "0";
              }
            })()} ETN`}
            change="Generated from staking"
            changeType="positive"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Lifetime ROI"
            colorIndex={15}
            aosDelay={300}
          />
          <StatCard
            title="Level Income"
            value={`${(() => {
              try {
                const bn = BigInt(userReport?.totalLevelRewardEarned ?? "0");
                return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
              } catch {
                return "0";
              }
            })()} ETN`}
            change="Team level rewards"
            changeType="positive"
            icon={<Zap className="w-5 h-5" />}
            description="Lifetime level income"
            colorIndex={16}
            aosDelay={350}
          />
          <StatCard
            title="Referrer"
            value={referrerAddr ?? "None"}
            change="Registered referrer"
            changeType="neutral"
            icon={<Clock className="w-5 h-5" />}
            description="Your referrer"
            colorIndex={17}
            aosDelay={400}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="zoom-in"
              data-aos-delay="150"
            >
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-yellow-400">
                  Stake ETN Tokens
                </CardTitle>
                {/* Persistent referral link generator (always available when connected) */}
                {connectedAddress && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const base = `${window.location.origin}${window.location.pathname}`;
                        const link = `${base}?ref=${connectedAddress}`;
                        await navigator.clipboard.writeText(link);
                        toast.success("Referral link copied to clipboard");
                      } catch (e) {
                        console.error("Copy failed", e);
                        toast.error("Failed to copy referral link");
                      }
                    }}
                    className="bg-yellow-500 text-black px-3 py-1 rounded"
                  >
                    Copy my referral link
                  </button>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="stake" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 input-bg">
                    <TabsTrigger value="stake" className="text-light-100">
                      Stake
                    </TabsTrigger>
                    <TabsTrigger value="unstake" className="text-light-100">
                      Unstake
                    </TabsTrigger>
                  </TabsList>

                  {/* Stake Tab */}
                  <TabsContent value="stake" className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Your ETN Balance:</span>
                        <span className="text-yellow-400">
                          {(Number(BigInt(tokenBalance || "0")) / 1e18).toFixed(
                            3
                          )}{" "}
                          ETN
                        </span>
                      </div>

                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">
                          Amount to Stake (USDT)
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="custom-input input-bg border-gray-700 text-white"
                        />
                      </div>

                      {/* Hide referral input when a referrer is already registered on-chain */}
                      {!hasRegisteredReferrer ? (
                        <>
                          <label className="text-sm text-gray-400 mb-2 block">
                            Enter Referral Address
                          </label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="0x..."
                              value={referralAddress}
                              onChange={(e) => {
                                if (!referralLocked) {
                                  setReferralAddress(e.target.value);
                                }
                              }}
                              readOnly={referralLocked}
                              className={`custom-input input-bg border-gray-700 text-white pr-20 ${
                                referralLocked ? "cursor-not-allowed" : ""
                              }`}
                            />
                            {referralLocked && (
                              <p className="mt-2 text-xs text-yellow-400">
                                Referral locked from invite link.
                              </p>
                            )}
                            {/* (Referral link generator moved to top-right of card header) */}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">
                          Referrer:{" "}
                          <span className="text-yellow-400">
                            {referrerAddr}
                          </span>
                        </div>
                      )}

                      {parseFloat(stakeAmount || "0") > 0 && (
                        <div className="input-bg p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Gross Quote (ETHAN):</span>
                            <span className="text-yellow-400">
                              {quotedETHAN || "0"} ETN
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>After 1% Burn (received):</span>
                            <span className="text-green-400">
                              {netQuotedETHAN || "0"} ETN
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            {/* <span>Daily Rewards:</span>
                            <span className="text-green-400">
                              +{calculateRewards(stakeAmount)} ETN
                            </span> */}
                          </div>
                        </div>
                      )}

                      <Button
                        className="custom-btns btn-bg-yellow hover:bg-yellow-600 text-black font-semibold"
                        disabled={
                          !stakeAmount ||
                          parseFloat(stakeAmount) <= 0 ||
                          !netQuotedETHAN ||
                          parseFloat(netQuotedETHAN || "0") <= 0 ||
                          isProcessing ||
                          swapLoading
                        }
                        onClick={handleSwapAndStake}
                      >
                        {swapLoading || isProcessing
                          ? "Processing..."
                          : "Swap & Stake"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      {/* ETN -> USDT swap (simple one-off) */}
                      {/* <div className="mt-6 p-4 input-bg rounded-lg">
                        <h4 className="text-sm text-gray-300 mb-3">
                          Convert ETN → USDT
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">
                              Amount (ETN)
                            </label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={etnSellAmount}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "" || /^\d*\.?\d*$/.test(v))
                                  setEtnSellAmount(v);
                              }}
                              className="custom-input input-bg border-gray-700 text-white"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-sm text-gray-400 mb-1">
                              <span>Gross Quote (USDT)</span>
                              <span className="text-yellow-400">
                                {quotedUSDT || "0"} USDT
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400 mb-1">
                              <span>After 1% Burn (you receive)</span>
                              <span className="text-green-400">
                                {netQuotedUSDT || "0"} USDT
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Quote updates automatically as you type.
                            </div>
                          </div>

                          <div>
                            <Button
                              className="w-full bg-transparent border border-yellow-500 text-yellow-400"
                              disabled={
                                !etnSellAmount ||
                                parseFloat(etnSellAmount || "0") <= 0 ||
                                !netQuotedUSDT ||
                                parseFloat(netQuotedUSDT || "0") <= 0 ||
                                isSellProcessing ||
                                swapLoading
                              }
                              onClick={async () => {
                                if (!connectedAddress) {
                                  toast.error(
                                    "Please connect your wallet to swap"
                                  );
                                  return;
                                }

                                const amt = parseFloat(etnSellAmount || "0");
                                if (isNaN(amt) || amt <= 0) {
                                  toast.error(
                                    "Enter a valid ETN amount to swap"
                                  );
                                  return;
                                }

                                if (!quotedUSDT || quotedUSDT === "0") {
                                  toast.error(
                                    "Unable to fetch quote. Try again later."
                                  );
                                  return;
                                }

                                if (!netQuotedUSDT || netQuotedUSDT === "0") {
                                  toast.error(
                                    "Unable to calculate USDT after burn."
                                  );
                                  return;
                                }

                                setIsSellProcessing(true);
                                try {
                                  const swapToast = toast.loading(
                                    `Swapping ${etnSellAmount} ETN → USDT...`
                                  );
                                  const txHash = await executeSwap(
                                    etnSellAmount,
                                    netQuotedUSDT,
                                    tokens.ETHAN,
                                    tokens.USDT,
                                    2
                                  );
                                  toast.dismiss(swapToast);
                                  if (!txHash) {
                                    toast.error("Swap failed");
                                    return;
                                  }
                                  toast.success("Swap completed");

                                  if (
                                    typeof refetchTokenBalance === "function"
                                  ) {
                                    try {
                                      await refetchTokenBalance();
                                    } catch {
                                      // ignore
                                    }
                                  }

                                  setEtnSellAmount("");
                                  setQuotedUSDT("0");
                                } catch (err) {
                                  console.error("ETN->USDT swap failed", err);
                                  toast.error("Swap failed");
                                } finally {
                                  setIsSellProcessing(false);
                                }
                              }}
                            >
                              {isSellProcessing || swapLoading
                                ? "Processing..."
                                : "Swap ETN → USDT"}
                            </Button>
                          </div>
                        </div>
                      </div> */}
                    </div>
                  </TabsContent>

                  {/* Unstake Tab */}
                  <TabsContent value="unstake" className="space-y-6">
                    <div className="space-y-4 mt-4">
                      <Input
                        type="number"
                        placeholder="Amount to Unstake"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        className="custom-input input-bg border-gray-700 text-white"
                      />
                      <div className="text-sm text-gray-400">
                        Available to unstake:{" "}
                        <span className="text-yellow-400">
                          {userStakedHuman} ETN
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        className="custom-btns btn-bg-yellow border-red-500/20 text-red-400 hover:bg-red-500/10"
                        disabled={
                          !unstakeAmount || parseFloat(unstakeAmount) <= 0
                        }
                        onClick={async () => {
                          try {
                            await unstakeTx(unstakeAmount);
                            setUnstakeAmount("");
                            refetchUserInfo();
                            refetchPendingRewards();
                          } catch (e) {
                            console.error("Unstake failed", e);
                            toast.error("Unstake transaction failed");
                          }
                        }}
                      >
                        Unstake
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Rewards */}
          <div className="space-y-6">
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="fade-up"
              data-aos-delay="150"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Pending Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-white">
                    {pendingRewardsHuman} ETN
                  </p>
                </div>
                <p className="text-xs text-gray-400 text-center mb-2">
                  Rewards are compounded back into your stake automatically. Use
                  the refresh button to fetch the latest accrued amount or
                  unstake to realize profits.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 card-btn card-btn-sec-bg"
                    onClick={async () => {
                      try {
                        await refetchPendingRewards();
                        refetchUserInfo();
                        toast.success("Pending rewards updated");
                      } catch (e) {
                        console.error("Refresh failed", e);
                        toast.error("Failed to refresh rewards");
                      }
                    }}
                  >
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ROI Generated */}
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">ROI Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <ROIList
                  fetchFull={fetchROIHistoryFull}
                  fetchLastN={fetchLastNROIEvents}
                />
              </CardContent>
            </Card>

            {/* Income by Level */}
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="fade-up"
              data-aos-delay="350"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Income by Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LevelIncomeList fetchUserLevelIncome={fetchUserLevelIncome} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ROIList({
  fetchFull,
  fetchLastN,
}: {
  fetchFull: () => Promise<Array<{ amount: string; timestamp: number }>>;
  fetchLastN: (
    max: number
  ) => Promise<Array<{ amount: string; timestamp: number }>>;
}) {
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
      const data = useLastN ? await fetchLastN(50) : await fetchFull();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="card-btn card-btn-bg"
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
            className="card-btn card-btn-sec-bg"
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
        <ul className="space-y-1 max-h-64 overflow-auto pr-1">
          {items.map((e, i) => (
            <li
              key={`s-roi-${i}`}
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

function LevelIncomeList({
  fetchUserLevelIncome,
}: {
  fetchUserLevelIncome: () => Promise<string[]>;
}) {
  const [loading, setLoading] = useState(false);
  const [levelIncome, setLevelIncome] = useState<string[]>([]);
  const load = async () => {
    try {
      setLoading(true);
      const arr = await fetchUserLevelIncome();
      setLevelIncome(arr);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // auto-load once
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Button
          size="sm"
          variant="outline"
          className="card-btn card-btn-sec-bg"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Loading…" : levelIncome.length ? "Refresh" : "Load"}
        </Button>
      </div>
      {levelIncome && levelIncome.some((v) => v !== "0") ? (
        <ul className="space-y-1">
          {levelIncome.map((v, i) => {
            if (!v || v === "0") return null;
            let human = "0";
            try {
              human = (Number(BigInt(v) / 10n ** 15n) / 1000).toLocaleString();
            } catch {
              // ignore parse
            }
            return (
              <li
                key={`lvl-${i}`}
                className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
              >
                <span className="text-gray-200">L{i + 1}</span>
                <span className="text-yellow-400">{human} ETN</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">No level income yet</p>
      )}
    </div>
  );
}
