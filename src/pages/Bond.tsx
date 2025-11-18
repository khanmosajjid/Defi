import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/common/StatCard";
import {
  Coins,
  TrendingUp,
  Clock,
  ArrowRight,
  Info,
  CheckCircle,
} from "lucide-react";
import { useStakingContract } from "@/service/stakingService";
import { DEFAULT_REFERRER, CONTRACT_ADDRESSES } from "@/lib/constants";
import { toast } from "react-hot-toast";
import { useTokenSwap } from "@/hooks/useTokenSwap";
import { formatUnits, parseUnits } from "viem";

const NET_RATE_NUMERATOR = 99n;
const NET_RATE_DENOMINATOR = 100n;

const trimTrailingZeros = (value: string) => {
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/(\.\d*?)0+$/u, "$1").replace(/\.$/u, "");
  return trimmed.length > 0 ? trimmed : "0";
};

export default function Bond() {
  const {
    fetchBondPlans,
    fetchUserBonds,
    buyBond,
    withdrawBond,
    tokenBalance,
    userInfo,
    refetchTokenBalance,
  } = useStakingContract();
  const { getQuote, executeSwap, isLoading: swapLoading } = useTokenSwap();
  const [plans, setPlans] = useState<
    Array<{
      id: number;
      duration: number;
      rewardPercent: number;
      exists: boolean;
    }>
  >([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [bondAmount, setBondAmount] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [quotedETN, setQuotedETN] = useState("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const [referralAddress, setReferralAddress] =
    useState<string>(DEFAULT_REFERRER);
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingUserBonds, setLoadingUserBonds] = useState(false);
  type UserBond = {
    index: number;
    planId: number;
    principal: string;
    reward: string;
    total: string;
    totalHuman: string;
    startAt: number;
    endAt: number;
    withdrawn: boolean;
    rewardPercent: number;
    status: "Active" | "Matured" | "Withdrawn";
  };
  const [userBonds, setUserBonds] = useState<UserBond[]>([]);

  const tokens = {
    USDT: "0x55d398326f99059fF775485246999027B3197955", // BSC mainnet USDT
    ETHAN: CONTRACT_ADDRESSES.token,
  } as const;

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

  const formatTokenAmount = (value?: string) => {
    try {
      if (!value) return "0";
      return trimTrailingZeros(formatUnits(BigInt(value), 18));
    } catch {
      return "0";
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingPlans(true);
        const p = await fetchBondPlans();
        if (alive) setPlans(p);
      } finally {
        setLoadingPlans(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchBondPlans]);

  async function reloadUserBonds() {
    try {
      setLoadingUserBonds(true);
      const list = await fetchUserBonds();
      setUserBonds(list);
    } finally {
      setLoadingUserBonds(false);
    }
  }

  useEffect(() => {
    reloadUserBonds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.startsWith("0x")) {
        setRefFromUrl(ref);
        setReferralAddress(ref);
      }
    } catch (err) {
      console.error("Failed to parse referral from URL", err);
    }
  }, []);

  const hasRegisteredReferrer = (() => {
    const ref = userInfo?.referrer;
    if (!ref) return false;
    try {
      return (
        typeof ref === "string" &&
        ref.toLowerCase() !== "0x0000000000000000000000000000000000000000"
      );
    } catch {
      return false;
    }
  })();

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
  }, [hasRegisteredReferrer, refFromUrl]);

  const referralLocked = Boolean(refFromUrl && !hasRegisteredReferrer);

  const tokenBalanceHuman = useMemo(() => {
    try {
      const bn = BigInt(tokenBalance || "0");
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  }, [tokenBalance]);

  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
        if (!cancelled) setQuotedETN("0");
        return;
      }
      try {
        const quote = await getQuote(usdtAmount, tokens.USDT, tokens.ETHAN);
        if (!cancelled) setQuotedETN(quote);
      } catch (err) {
        console.error("Bond quote fetch failed", err);
        if (!cancelled) setQuotedETN("0");
      }
    };

    void fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [getQuote, tokens.ETHAN, tokens.USDT, usdtAmount]);

  useEffect(() => {
    const numericQuote = parseFloat(quotedETN || "0");
    if (!quotedETN || Number.isNaN(numericQuote) || numericQuote <= 0) {
      setBondAmount("0");
      return;
    }
    try {
      const quotedWei = parseUnits(quotedETN, 18);
      if (quotedWei <= 0n) {
        setBondAmount("0");
        return;
      }
      const netWei = (quotedWei * NET_RATE_NUMERATOR) / NET_RATE_DENOMINATOR;
      setBondAmount(
        netWei > 0n ? trimTrailingZeros(formatUnits(netWei, 18)) : "0"
      );
    } catch (error) {
      setBondAmount("0");
    }
  }, [quotedETN]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  async function handleBuy() {
    if (isProcessing) return;
    if (!selectedPlan) {
      toast.error("Select a bond plan to continue");
      return;
    }

    let quotedWei: bigint;
    try {
      quotedWei = parseUnits(quotedETN || "0", 18);
    } catch (error) {
      console.error("Failed to parse quoted amount", error);
      toast.error("Unable to determine swap quote");
      return;
    }

    if (quotedWei <= 0n) {
      toast.error("Enter a valid USDT amount");
      return;
    }

    // apply 1% deduction to the quoted ETN before bonding
    const netWei = (quotedWei * NET_RATE_NUMERATOR) / NET_RATE_DENOMINATOR;
    if (netWei <= 0n) {
      toast.error("Amount too low after 1% deduction");
      return;
    }

    setIsProcessing(true);
    try {
      const overrideRef = hasRegisteredReferrer
        ? undefined
        : referralAddress && referralAddress.startsWith("0x")
        ? referralAddress
        : DEFAULT_REFERRER;

      let walletBalanceWei = parseBigIntSafe(tokenBalance) ?? 0n;

      if (walletBalanceWei < netWei) {
        if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
          toast.error("Enter the USDT amount you want to bond");
          return;
        }

        const minOut = trimTrailingZeros(formatUnits(netWei, 18));
        const swapToast = toast.loading(
          `Swapping ${usdtAmount} USDT for ETN...`
        );

        const txHash = await executeSwap(
          usdtAmount,
          minOut,
          tokens.USDT,
          tokens.ETHAN,
          1
        );

        toast.dismiss(swapToast);

        if (!txHash) {
          return;
        }

        if (typeof refetchTokenBalance === "function") {
          try {
            const refreshed = await refetchTokenBalance();
            const refreshedValue = (refreshed as { data?: unknown })?.data;
            const parsed = parseBigIntSafe(refreshedValue);
            if (parsed !== null) {
              walletBalanceWei = parsed;
            }
          } catch (balanceError) {
            console.error("Failed to refresh ETN balance", balanceError);
          }
        } else {
          walletBalanceWei = parseBigIntSafe(tokenBalance) ?? 0n;
        }
      }

      if (walletBalanceWei <= 0n) {
        toast.error("No ETN balance available to bond");
        return;
      }

      const bondWei = walletBalanceWei >= netWei ? netWei : walletBalanceWei;
      if (bondWei <= 0n) {
        toast.error("Bond amount too low");
        return;
      }

      const bondDecimal = trimTrailingZeros(formatUnits(bondWei, 18));
      setBondAmount(bondDecimal);

      await buyBond(selectedPlan.id, bondDecimal, overrideRef);
      setUsdtAmount("");
      setQuotedETN("0");
      await reloadUserBonds();
      if (typeof refetchTokenBalance === "function") {
        void refetchTokenBalance();
      }
    } catch (error) {
      console.error("Bond purchase failed", error);
      toast.error("Bond purchase failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bread-shape">
        <div className="breadcrumb-bg"></div>
      </div>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            Bonds
          </h1>
          <p className="text-gray-400">
            Purchase bonds at a discount and receive ETN tokens after vesting
            period
          </p>
        </div>

        {/* Bond Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Token Balance"
            value={`${tokenBalanceHuman} ETN`}
            change=""
            changeType="neutral"
            icon={<Coins className="w-5 h-5" />}
            description="Available to bond"
            colorIndex={7}
            aosDelay={50}
          />
          <StatCard
            title="Your Bonds"
            value={`${userBonds.length}`}
            change=""
            changeType="neutral"
            icon={<Clock className="w-5 h-5" />}
            description="Active and matured"
            colorIndex={8}
            aosDelay={100}
          />
          <StatCard
            title="Plans Available"
            value={`${plans.length}`}
            change={loadingPlans ? "Loading…" : ""}
            changeType="neutral"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Configured by protocol"
            aosDelay={150}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Bonds */}
          <div className="lg:col-span-2">
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="zoom-in"
              data-aos-delay="150"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Available Bond Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans.length === 0 && (
                  <div className="p-4 input-bg rounded text-gray-400">
                    No bond plans found
                  </div>
                )}
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedPlanId === p.id
                        ? "border-yellow-500 bg-yellow-500/5"
                        : "border-gray-700 input-bg hover:border-gray-600"
                    }`}
                    onClick={() => setSelectedPlanId(p.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">
                          Plan #{p.id}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Reward credited to stake instantly
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge
                          variant="outline"
                          className="border-yellow-500 text-yellow-400"
                        >
                          Bond
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Reward</p>
                        <p className="font-semibold text-green-400">
                          {p.rewardPercent}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Duration</p>
                        <p className="font-semibold">
                          {Math.floor(p.duration / 86400)} days
                        </p>
                      </div>
                      <div />
                      <div />
                    </div>
                  </div>
                ))}

                {/* Bond Purchase Interface */}
                {selectedPlan && (
                  <div className="mt-6 p-4 input-bg rounded-lg border border-yellow-500/20">
                    <h4 className="font-semibold text-yellow-400 mb-4">
                      Purchase Bond
                    </h4>

                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">
                            Amount (USDT)
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={usdtAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setUsdtAmount(value);
                              }
                            }}
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the USDT amount to convert into ETN for this
                            bond.
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">
                            Estimated ETN (after 1% deduction)
                          </label>
                          <Input
                            type="text"
                            value={bondAmount || "0"}
                            readOnly
                            className="bg-gray-900 border-gray-700 text-white cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Auto-updated from the current swap quote (1%
                            deduction applied).
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        Wallet ETN balance:{" "}
                        <span className="text-yellow-400">
                          {tokenBalanceHuman} ETN
                        </span>
                      </div>
                      {parseFloat(quotedETN || "0") > 0 && (
                        <div className="text-xs text-gray-500">
                          Quote before deduction: {trimTrailingZeros(quotedETN)}{" "}
                          ETN
                        </div>
                      )}

                      {hasRegisteredReferrer ? (
                        <div className="text-sm text-gray-400">
                          Referrer:{" "}
                          <span className="text-yellow-400">
                            {userInfo?.referrerShort ?? "Registered"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">
                            Referral Address (optional)
                          </label>
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
                            className={`bg-gray-900 border-gray-700 text-white ${
                              referralLocked ? "cursor-not-allowed" : ""
                            }`}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {referralLocked
                              ? "Referral locked from invite link."
                              : "Provide a sponsor wallet to register before your first bond purchase."}
                          </p>
                        </div>
                      )}

                      {parseFloat(bondAmount || "0") > 0 && selectedPlan && (
                        <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">USDT input:</span>
                            <span className="text-white">
                              {(() => {
                                const val = parseFloat(usdtAmount || "0");
                                return Number.isNaN(val)
                                  ? "0"
                                  : val.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    });
                              })()}{" "}
                              USDT
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              Bond principal:
                            </span>
                            <span className="text-white">
                              {(() => {
                                const amt = parseFloat(bondAmount || "0");
                                return Number.isNaN(amt)
                                  ? "0"
                                  : amt.toLocaleString(undefined, {
                                      maximumFractionDigits: 6,
                                    });
                              })()}{" "}
                              ETN
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              You will receive:
                            </span>
                            <span className="text-green-400">
                              {(() => {
                                const amt = parseFloat(bondAmount || "0");
                                const total =
                                  amt +
                                  amt *
                                    ((selectedPlan?.rewardPercent || 0) / 100);
                                return isNaN(total)
                                  ? "0"
                                  : total.toLocaleString(undefined, {
                                      maximumFractionDigits: 6,
                                    });
                              })()}{" "}
                              ETN
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              Vesting period:
                            </span>
                            <span className="text-yellow-400">
                              {Math.floor(
                                (selectedPlan?.duration || 0) / 86400
                              )}{" "}
                              days
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Reward:</span>
                            <span className="text-green-400">
                              {selectedPlan?.rewardPercent}%
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                        disabled={
                          isProcessing ||
                          swapLoading ||
                          parseFloat(usdtAmount || "0") <= 0 ||
                          parseFloat(bondAmount || "0") <= 0
                        }
                        onClick={handleBuy}
                      >
                        {isProcessing || swapLoading ? (
                          "Processing..."
                        ) : (
                          <span className="flex items-center justify-center">
                            Purchase Bond
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Your Bonds */}
          <div>
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20"
              data-aos="fade-up"
              data-aos-delay="150"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">Your Bonds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingUserBonds && (
                  <div className="p-4 input-bg rounded text-gray-400">
                    Loading…
                  </div>
                )}
                {!loadingUserBonds && userBonds.length === 0 && (
                  <div className="p-4 input-bg rounded text-gray-400">
                    No bonds found
                  </div>
                )}
                {userBonds.map((bond) => (
                  <div key={bond.index} className="p-4 input-bg rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-white">
                          Plan #{bond.planId}
                        </h4>
                        <p className="text-sm text-gray-400">
                          Total: {bond.totalHuman} ETN
                        </p>
                      </div>
                      {bond.status === "Matured" && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Principal:</span>
                        <span className="text-white">
                          {formatTokenAmount(bond.principal)} ETN
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Reward:</span>
                        <span className="text-green-400">
                          {formatTokenAmount(bond.reward)} ETN
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-white">{bond.status}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Ends at:</span>
                        <span className="text-yellow-400">
                          {new Date(bond.endAt * 1000).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {bond.status === "Matured" && !bond.withdrawn ? (
                      <Button
                        className="w-full mt-3 bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          await withdrawBond(bond.index);
                          await reloadUserBonds();
                        }}
                      >
                        Withdraw Bond
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full mt-3"
                        disabled
                      >
                        {bond.status}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Bond Info */}
            <Card
              className="card-box from-gray-900 to-gray-800 border-yellow-500/20 mt-6"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  How Bonds Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-300">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>
                      Purchase bonds with ETN to immediately increase your stake
                      by (principal + reward%).
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>
                      Each plan has a duration; you can withdraw the bonded
                      amount when it matures.
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <p>
                      Use the Withdraw button on matured bonds to receive your
                      credited tokens.
                    </p>
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
