import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { DEFAULT_REFERRER } from "@/lib/constants";

export default function Bond() {
  const {
    fetchBondPlans,
    fetchUserBonds,
    buyBond,
    withdrawBond,
    tokenBalance,
    userInfo,
  } = useStakingContract();
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
  const [referralAddress, setReferralAddress] = useState(DEFAULT_REFERRER);
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingUserBonds, setLoadingUserBonds] = useState(false);
  const [userBonds, setUserBonds] = useState<
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

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  async function handleBuy() {
    if (!selectedPlan || !bondAmount || Number(bondAmount) <= 0) return;
    const overrideRef = hasRegisteredReferrer
      ? undefined
      : referralAddress && referralAddress.startsWith("0x")
      ? referralAddress
      : DEFAULT_REFERRER;
    await buyBond(selectedPlan.id, bondAmount, overrideRef);
    setBondAmount("");
    await reloadUserBonds();
  }

  return (
    <div className="min-h-screen bg-black text-white">
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
          />
          <StatCard
            title="Your Bonds"
            value={`${userBonds.length}`}
            change=""
            changeType="neutral"
            icon={<Clock className="w-5 h-5" />}
            description="Active and matured"
          />
          <StatCard
            title="Plans Available"
            value={`${plans.length}`}
            change={loadingPlans ? "Loading…" : ""}
            changeType="neutral"
            icon={<TrendingUp className="w-5 h-5" />}
            description="Configured by protocol"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Bonds */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">
                  Available Bond Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans.length === 0 && (
                  <div className="p-4 bg-gray-800 rounded text-gray-400">
                    No bond plans found
                  </div>
                )}
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedPlanId === p.id
                        ? "border-yellow-500 bg-yellow-500/5"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
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
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-yellow-500/20">
                    <h4 className="font-semibold text-yellow-400 mb-4">
                      Purchase Bond
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">
                          Amount (ETN)
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={bondAmount}
                          onChange={(e) => setBondAmount(e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                        <div className="flex justify-between text-sm text-gray-400 mt-2">
                          <span>Balance: {tokenBalanceHuman} ETN</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:text-yellow-300 p-0 h-auto"
                            onClick={() =>
                              setBondAmount(tokenBalanceHuman.replace(/,/g, ""))
                            }
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

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

                      {bondAmount && selectedPlan && (
                        <div className="bg-gray-900 p-4 rounded-lg space-y-2">
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
                                  : total.toLocaleString();
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
                        disabled={!bondAmount || parseFloat(bondAmount) <= 0}
                        onClick={handleBuy}
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
                {loadingUserBonds && (
                  <div className="p-4 bg-gray-800 rounded text-gray-400">
                    Loading…
                  </div>
                )}
                {!loadingUserBonds && userBonds.length === 0 && (
                  <div className="p-4 bg-gray-800 rounded text-gray-400">
                    No bonds found
                  </div>
                )}
                {userBonds.map((bond) => (
                  <div key={bond.index} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-white">
                          Plan #{bond.planId}
                        </h4>
                        <p className="text-sm text-gray-400">
                          Amount: {bond.amountHuman} ETN
                        </p>
                      </div>
                      {bond.status === "Matured" && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                    </div>

                    <div className="space-y-2">
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
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20 mt-6">
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
