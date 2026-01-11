import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useStakingContract,
  type RoiHistoryEntry,
} from "@/service/stakingService";

const formatTimestamp = (value?: number) => {
  if (!value) return "-";
  try {
    return new Date(value * 1000).toLocaleString();
  } catch {
    return "-";
  }
};

export default function UserReport() {
  const { userReport, userInfo, fetchUserLevelIncome, fetchUserRoiHistory } =
    useStakingContract();

  const formatWeiToETN = useCallback((wei?: string | null) => {
    try {
      if (!wei) return "0";
      const bn = BigInt(wei);
      return (Number(bn / 10n ** 15n) / 1000).toLocaleString();
    } catch {
      return "0";
    }
  }, []);

  const [levelIncome, setLevelIncome] = useState<string[]>([]);
  const [levelIncomeLoading, setLevelIncomeLoading] = useState(false);
  const [roiHistory, setRoiHistory] = useState<RoiHistoryEntry[]>([]);
  const [roiLoading, setRoiLoading] = useState(false);

  const loadLevelIncome = useCallback(async () => {
    try {
      setLevelIncomeLoading(true);
      const arr = await fetchUserLevelIncome();
      setLevelIncome(Array.isArray(arr) ? arr : []);
    } catch (error) {
      console.error("loadLevelIncome failed", error);
      setLevelIncome([]);
    } finally {
      setLevelIncomeLoading(false);
    }
  }, [fetchUserLevelIncome]);

  useEffect(() => {
    void loadLevelIncome();
  }, [loadLevelIncome]);

  const loadRoiHistory = useCallback(async () => {
    try {
      setRoiLoading(true);
      const history = await fetchUserRoiHistory();
      setRoiHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error("loadRoiHistory failed", error);
      setRoiHistory([]);
    } finally {
      setRoiLoading(false);
    }
  }, [fetchUserRoiHistory]);

  useEffect(() => {
    void loadRoiHistory();
  }, [loadRoiHistory]);

  const totalLevelIncomeHuman = useMemo(() => {
    try {
      const total = levelIncome.reduce<bigint>((acc, value) => {
        try {
          return acc + BigInt(value ?? "0");
        } catch {
          return acc;
        }
      }, 0n);
      return formatWeiToETN(total.toString());
    } catch {
      return "0";
    }
  }, [formatWeiToETN, levelIncome]);

  const incomeCards = useMemo(
    () => [
      {
        title: "Pending ROI",
        value: `${formatWeiToETN(userReport?.pendingRoi)} ETN`,
      },
      {
        title: "Total ROI earned",
        value: `${formatWeiToETN(userReport?.totalRoiEarned)} ETN`,
      },
      {
        title: "Level rewards earned",
        value: `${formatWeiToETN(userReport?.totalLevelRewardEarned)} ETN`,
      },
      {
        title: "Team level income",
        value: `${totalLevelIncomeHuman} ETN`,
      },
      {
        title: "Referral income",
        value: `${formatWeiToETN(userReport?.totalReferralIncome)} ETN`,
      },
      {
        title: "Total withdrawn",
        value: `${formatWeiToETN(userReport?.totalWithdrawn)} ETN`,
      },
      {
        title: "Active bond value",
        value: `${formatWeiToETN(userInfo?.activeBondValue)} ETN`,
      },
    ],
    [
      formatWeiToETN,
      totalLevelIncomeHuman,
      userInfo?.activeBondValue,
      userReport?.pendingRoi,
      userReport?.totalLevelRewardEarned,
      userReport?.totalReferralIncome,
      userReport?.totalRoiEarned,
      userReport?.totalWithdrawn,
    ]
  );

  const levelIncomeRows = useMemo(
    () =>
      levelIncome.map((value, index) => {
        const human = formatWeiToETN(value);
        return {
          level: index + 1,
          amount: human,
          hasIncome: value && value !== "0",
        };
      }),
    [formatWeiToETN, levelIncome]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            User Report
          </h1>
          <p className="text-gray-400">
            Consolidated view of every income stream credited to your wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {incomeCards.map((card) => (
            <div
              key={card.title}
              className="p-4 input-bg rounded-lg border border-yellow-500/20 flex flex-col gap-1"
            >
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {card.title}
              </span>
              <span className="text-xl font-semibold text-yellow-300">
                {card.value}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-yellow-400 text-lg">
                Income by level
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="card-btn card-btn-sec-bg"
                onClick={() => void loadLevelIncome()}
                disabled={levelIncomeLoading}
              >
                {levelIncomeLoading ? "Loading…" : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent>
              {levelIncomeRows.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No level income recorded yet.
                </p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-auto pr-1">
                  {levelIncomeRows.map((row) => (
                    <li
                      key={`lvl-income-${row.level}`}
                      className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                    >
                      <span className="text-sm text-gray-200">
                        Level {row.level}
                      </span>
                      <span
                        className={
                          row.hasIncome ? "text-yellow-300" : "text-gray-500"
                        }
                      >
                        {row.hasIncome ? `${row.amount} ETN` : "0 ETN"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 text-sm text-gray-400">
                <span>Total earned:</span>
                <span className="ml-2 text-yellow-300 font-semibold">
                  {totalLevelIncomeHuman} ETN
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-yellow-400 text-lg">
                ROI history
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="card-btn card-btn-sec-bg"
                onClick={() => void loadRoiHistory()}
                disabled={roiLoading}
              >
                {roiLoading ? "Loading…" : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent>
              {roiHistory.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No ROI entries recorded yet.
                </p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-auto pr-1">
                  {roiHistory.map((entry, index) => (
                    <li
                      key={`roi-entry-${entry.timestamp}-${index}`}
                      className="flex items-center justify-between bg-gray-900/60 px-3 py-2 rounded"
                    >
                      <span className="text-sm text-gray-300">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span className="text-sm text-green-400 font-medium">
                        +{formatWeiToETN(entry.amount)} ETN
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
