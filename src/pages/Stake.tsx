import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useStakingContract } from "@/service/stakingService";
import { useAccount, useChainId } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/common/StatCard";
import { Coins, TrendingUp, Clock, Zap, ArrowRight } from "lucide-react";
import { STATS, CONTRACT_ADDRESSES } from "@/lib/constants";
import { useTokenSwap } from "@/hooks/useTokenSwap";

export default function Stake() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [referralAddress, setReferralAddress] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quotedETHAN, setQuotedETHAN] = useState("0");

  const {
    stake: stakeTx,
    tokenBalance,
    userInfo,
    refetchUserInfo,
    refetchPendingRewards,
    pendingRewards: pendingRewardsRaw,
    pendingComputed,
    userLevel,
    userRewardPercent,
    unstake: unstakeTx,
    claimRewards,
  } = useStakingContract();

  console.log("User Info:", userInfo);

  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { getQuote, executeSwap, isLoading: swapLoading } = useTokenSwap();

  // referral param from URL (if present)
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);

  const tokens = {
    USDT: "0xbD740AFeAa78f104E5E0f6edb0e23e96ED9fEfC8",
    ETHAN: CONTRACT_ADDRESSES.token,
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

  const userStaked = userInfo?.selfStaked ?? "0";
  const pendingRewards =
    pendingRewardsRaw && pendingRewardsRaw !== "0"
      ? pendingRewardsRaw
      : pendingComputed || (userInfo && userInfo.rewardDebt) || "0";
  const directs = userInfo?.directs ?? 0;
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

  // parse referral from URL on first load
  useEffect(() => {
    try {
      const qp = new URLSearchParams(window.location.search);
      const r = qp.get("ref");
      if (r && typeof r === "string" && r.startsWith("0x")) {
        setRefFromUrl(r);
        // if user has no registered referrer yet, prefill the input
        if (!hasRegisteredReferrer && !referralAddress) {
          setReferralAddress(r);
        }
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when userInfo updates, if there's a refFromUrl and no on-chain referrer, keep the referral
  useEffect(() => {
    if (refFromUrl && !hasRegisteredReferrer && !referralAddress) {
      setReferralAddress(refFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo, refFromUrl]);

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

    // If the user already has a registered referrer on-chain, use that address.
    // Otherwise prefer the input referralAddress (if valid), then fall back to connected address.
    let ref = "";
    if (hasRegisteredReferrer && userInfo?.referrer) {
      ref = userInfo.referrer as string;
    } else {
      ref = referralAddress?.trim() ?? "";
      if (!ref || !ref.startsWith("0x")) ref = connectedAddress ?? "";
    }

    setIsProcessing(true);

    try {
      const balanceBig = BigInt(tokenBalance || "0");
      // estimated amount we expect from swap (human string), convert to wei
      const quotedOutFloat = parseFloat(quotedETHAN || "0");
      const quotedOutWei =
        quotedOutFloat > 0 ? BigInt(Math.floor(quotedOutFloat * 1e18)) : 0n;

      // base amount to stake is the quotedOutWei (what we expect to receive) or, when skipping swap, the quoted amount as well
      const baseStakeWei = quotedOutWei;

      // stake 98% to account for fees/slippage
      const stakeWeiToSend = baseStakeWei > 0n ? baseStakeWei : 0n;

      // If user already has sufficient balance (>= quotedOutWei), skip swap and stake the 98% of quoted amount
      if (balanceBig >= quotedOutWei && quotedOutWei > 0n) {
        toast.success("Sufficient token balance found — skipping swap");
        const stakeToast = toast.loading("Staking your tokens...");
        try {
          // convert stakeWeiToSend to decimal string with 18 decimals
          const whole = stakeWeiToSend / 10n ** 18n;
          const frac = stakeWeiToSend % 10n ** 18n;
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
          quotedETHAN,
          tokens.USDT,
          tokens.ETHAN,
          2
        );

        toast.dismiss(swapToastId);

        if (!txHash) {
          toast.error("Swap failed — staking aborted");
          setIsProcessing(false);
          return;
        }

        toast.success("Swap completed — proceeding to stake");

        const stakeToast = toast.loading("Staking...");
        try {
          // convert quotedETHAN to wei then take 98% to stake
          const quotedFloat = parseFloat(quotedETHAN || "0");
          const quotedWei =
            quotedFloat > 0 ? BigInt(Math.floor(quotedFloat * 1e18)) : 0n;
          const stakeWei = quotedWei > 0n ? quotedWei : 0n;
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
      setReferralAddress("");
    } catch (err) {
      console.error("Swap & stake failed:", err);
      toast.error("Swap & stake failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Staking
          </h1>
          <p className="text-gray-400">
            Stake ETN tokens and earn compound interest rewards every 8 hours
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Your Staked Amount"
            value={
              userStaked
                ? (
                    Number(BigInt(userStaked) / 10n ** 15n) / 1000
                  ).toLocaleString() + " ETN"
                : "0 ETN"
            }
            change={`+${
              pendingRewards
                ? (
                    Number(BigInt(pendingRewards) / 10n ** 15n) / 1000
                  ).toLocaleString()
                : "0"
            } pending`}
            changeType="positive"
            icon={<Coins className="w-5 h-5" />}
            description="Currently staked"
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
          />
          <StatCard
            title="Level"
            value={userLevel && userLevel > 0 ? `L${userLevel}` : "None"}
            change="Your level"
            changeType="neutral"
            icon={<Zap className="w-5 h-5" />}
            description="User level based on stake & directs"
          />
          <StatCard
            title="Referrer"
            value={referrerAddr ?? "None"}
            change="Registered referrer"
            changeType="neutral"
            icon={<Clock className="w-5 h-5" />}
            description="Your referrer"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
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
                  <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                    <TabsTrigger value="stake">Stake</TabsTrigger>
                    <TabsTrigger value="unstake">Unstake</TabsTrigger>
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
                          className="bg-gray-800 border-gray-700 text-white"
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
                              onChange={(e) =>
                                setReferralAddress(e.target.value)
                              }
                              className="bg-gray-800 border-gray-700 text-white pr-20"
                            />
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

                      {stakeAmount && (
                        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Approx Tokens (ETHAN):</span>
                            <span className="text-green-400">
                              {quotedETHAN || "0"} ETN
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Daily Rewards:</span>
                            <span className="text-green-400">
                              +{calculateRewards(stakeAmount)} ETN
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                        disabled={
                          !stakeAmount ||
                          parseFloat(stakeAmount) <= 0 ||
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
                    </div>
                  </TabsContent>

                  {/* Unstake Tab */}
                  <TabsContent value="unstake" className="space-y-6">
                    <div className="space-y-4">
                      <Input
                        type="number"
                        placeholder="Amount to Unstake"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <Button
                        variant="outline"
                        className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
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
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Pending Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-white">
                    {pendingRewards
                      ? (
                          Number(BigInt(pendingRewards) / 10n ** 15n) / 1000
                        ).toLocaleString() + " ETN"
                      : "0 ETN"}
                  </p>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    try {
                      await claimRewards();
                      refetchPendingRewards();
                      refetchUserInfo();
                    } catch (e) {
                      console.error("Claim failed", e);
                      toast.error("Claim transaction failed");
                    }
                  }}
                >
                  Claim Rewards
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
