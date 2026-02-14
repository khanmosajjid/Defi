import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useAccount, useReadContract } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { formatUnits, parseEther } from "viem";

import { CONTRACT_ADDRESSES } from "@/lib/constants";
import {
  useStakingContract,
  type DirectDetail,
} from "@/service/stakingService";
import CONTRACT_ABI from "@/service/stakingABI.json";

const PAGE_SIZE = 25;
const ADMIN_ALLOWLIST = new Set<string>([
  "0xa1abdac20c96db4b2e5685bd3ee66f7bcd487098",
]);

function formatTokenAmount(
  value?: string | bigint | null,
  decimals = 18,
  precision = 4,
) {
  if (value == null) return "0";
  try {
    const raw = typeof value === "bigint" ? value : BigInt(value);
    const formatted = formatUnits(raw, decimals);
    const [wholePart, fractionPart = ""] = formatted.split(".");
    const trimmedFraction = fractionPart
      .slice(0, precision)
      .replace(/0+$/u, "");
    const wholeWithSeparators = wholePart.replace(
      /\B(?=(\d{3})+(?!\d))/gu,
      ",",
    );
    return trimmedFraction
      ? `${wholeWithSeparators}.${trimmedFraction}`
      : wholeWithSeparators || "0";
  } catch {
    return typeof value === "string" ? value : value.toString();
  }
}

function normalizeAddress(value: string) {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/u.test(trimmed)) {
    return null;
  }
  return `0x${trimmed.slice(2).toLowerCase()}`;
}

function toBigIntOrZero(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (value == null) return 0n;
  try {
    if (typeof value === "number") return BigInt(Math.trunc(value));
    return BigInt(value.toString());
  } catch {
    return 0n;
  }
}

type ReadFunctionDefinition = {
  id: string;
  label: string;
  description: string;
  requiresAddress?: boolean;
  run: (wallet?: `0x${string}`) => Promise<unknown>;
};

const Admin = () => {
  const { address: connectedAddress } = useAccount();
  const {
    data: ownerAddress,
    isLoading: ownerLoading,
    refetch: refetchOwner,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.stakingPlatform as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });

  const ownerAddressString = useMemo(
    () => (typeof ownerAddress === "string" ? ownerAddress : undefined),
    [ownerAddress],
  );

  const isOwnerAccount = useMemo(() => {
    if (!connectedAddress || !ownerAddressString) return false;
    return ownerAddressString.toLowerCase() === connectedAddress.toLowerCase();
  }, [connectedAddress, ownerAddressString]);

  const hasPanelAccess = useMemo(() => {
    if (!connectedAddress) return false;
    const lowered = connectedAddress.toLowerCase();
    if (ownerAddressString && lowered === ownerAddressString.toLowerCase())
      return true;
    return ADMIN_ALLOWLIST.has(lowered);
  }, [connectedAddress, ownerAddressString]);

  const {
    totalStaked,
    tokenPriceUsd,
    manualTokenPrice,
    dailyRatePercent,
    tokenBalance,
    tokenAllowance,
    fetchUsersBatch,
    fetchMemberDetails,
    fetchCompanyPoolStatus,
    fetchTotalUsers,
    fetchUserBlockedStatus,
    blockUser: blockUserOnChain,
    unblockUser: unblockUserOnChain,
    setDailyRatePercent,
    batchCompoundAllUsers,
    fundCompanyPool,
    emergencyWithdrawTokens,
    emergencyResetUser,
    transferOwnership,
    fetchUserLevelIncome,
    fetchUserRoiHistory,
    fetchUserBondSnapshot,
    fetchStakeHistory,
    fetchUnstakeHistory,
    fetchTeamSize,
    refetchTokenAllowance,
    refetchTokenBalance,
  } = useStakingContract();

  const [pageIndex, setPageIndex] = useState(0);
  const [users, setUsers] = useState<DirectDetail[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [ownerStatsRefreshing, setOwnerStatsRefreshing] = useState(false);
  const [companyPool, setCompanyPool] = useState({
    poolBalance: "0",
    contractTokenBalance: "0",
  });

  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<DirectDetail | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [manageUserAddress, setManageUserAddress] = useState("");
  const [manageAction, setManageAction] = useState<null | "block" | "unblock">(
    null,
  );
  const [manageBlockedStatus, setManageBlockedStatus] = useState<
    boolean | null
  >(null);
  const [manageStatusLoading, setManageStatusLoading] = useState(false);
  const [manageStatusError, setManageStatusError] = useState<string | null>(
    null,
  );
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportPayload, setExportPayload] = useState<string | null>(null);
  const [copyingExport, setCopyingExport] = useState(false);
  const [exportingBonds, setExportingBonds] = useState(false);
  const [bondExportPayload, setBondExportPayload] = useState<string | null>(
    null,
  );
  const [copyingBondExport, setCopyingBondExport] = useState(false);
  const [roiHistory, setRoiHistory] = useState<
    Array<{ day: number; timestamp: number; amount: string }>
  >([]);
  const [roiLoading, setRoiLoading] = useState(false);
  const [roiError, setRoiError] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [fundingPool, setFundingPool] = useState(false);
  const [ownershipAddressInput, setOwnershipAddressInput] = useState("");
  const [transferringOwnership, setTransferringOwnership] = useState(false);
  const [dailyRateInput, setDailyRateInput] = useState("");
  const [updatingDailyRate, setUpdatingDailyRate] = useState(false);
  const [compoundFrom, setCompoundFrom] = useState("");
  const [compoundTo, setCompoundTo] = useState("");
  const [compoundingRange, setCompoundingRange] = useState(false);
  const [emergencyWithdrawAddress, setEmergencyWithdrawAddress] = useState("");
  const [emergencyWithdrawAmount, setEmergencyWithdrawAmount] = useState("");
  const [withdrawingEmergency, setWithdrawingEmergency] = useState(false);
  const [resetUserAddress, setResetUserAddress] = useState("");
  const [resettingUser, setResettingUser] = useState(false);
  const [readAddressInput, setReadAddressInput] = useState("");
  const [readOutputs, setReadOutputs] = useState<Record<string, string>>({});
  const [readErrors, setReadErrors] = useState<Record<string, string | null>>(
    {},
  );
  const [readLoadingId, setReadLoadingId] = useState<string | null>(null);

  const formatReadResult = useCallback((value: unknown) => {
    try {
      return JSON.stringify(
        value,
        (_key, item) => (typeof item === "bigint" ? item.toString() : item),
        2,
      );
    } catch {
      try {
        return JSON.stringify(String(value), null, 2);
      } catch {
        return String(value);
      }
    }
  }, []);

  const manageAddressIsValid = useMemo(
    () => Boolean(normalizeAddress(manageUserAddress)),
    [manageUserAddress],
  );
  const manageBusy = manageAction !== null || manageStatusLoading;

  useEffect(() => {
    setManageBlockedStatus(null);
    setManageStatusError(null);
  }, [manageUserAddress]);

  const ownerTokenBalanceBigInt = useMemo(
    () => toBigIntOrZero(tokenBalance),
    [tokenBalance],
  );
  const ownerAllowanceBigInt = useMemo(
    () => toBigIntOrZero(tokenAllowance),
    [tokenAllowance],
  );
  const ownerTokenBalanceDisplay = formatTokenAmount(
    ownerTokenBalanceBigInt,
    18,
  );
  const ownerAllowanceDisplay = formatTokenAmount(ownerAllowanceBigInt, 18);

  const readFunctionDefs = useMemo<ReadFunctionDefinition[]>(
    () => [
      {
        id: "companyPoolStatus",
        label: "Company Pool Status",
        description: "companyValuationPool() & balanceOf(contract) — global",
        requiresAddress: false,
        run: async () => {
          const status = await fetchCompanyPoolStatus();
          return {
            poolBalanceRaw: status.poolBalance,
            poolBalanceFormatted: formatTokenAmount(status.poolBalance),
            contractBalanceRaw: status.contractTokenBalance,
            contractBalanceFormatted: formatTokenAmount(
              status.contractTokenBalance,
            ),
          };
        },
      },
      {
        id: "ownerWalletAllowance",
        label: "Owner Wallet Allowance",
        description: "balanceOf(owner) & allowance(owner, contract)",
        requiresAddress: false,
        run: async () => {
          const [balanceResult, allowanceResult] = await Promise.allSettled([
            refetchTokenBalance(),
            refetchTokenAllowance(),
          ]);
          const balanceValue =
            balanceResult.status === "fulfilled"
              ? toBigIntOrZero(balanceResult.value.data)
              : ownerTokenBalanceBigInt;
          const allowanceValue =
            allowanceResult.status === "fulfilled"
              ? toBigIntOrZero(allowanceResult.value.data)
              : ownerAllowanceBigInt;
          return {
            wallet: connectedAddress ?? null,
            balanceRaw: balanceValue.toString(),
            balanceFormatted: formatTokenAmount(balanceValue),
            allowanceRaw: allowanceValue.toString(),
            allowanceFormatted: formatTokenAmount(allowanceValue),
          };
        },
      },
      {
        id: "totalStaked",
        label: "Total Staked (Global)",
        description: "totalStaked() — global",
        requiresAddress: false,
        run: async () => {
          let raw = "0";
          try {
            raw =
              typeof totalStaked === "bigint"
                ? totalStaked.toString()
                : String(totalStaked ?? "0");
          } catch {
            raw = String(totalStaked ?? "0");
          }
          return {
            raw,
            formatted: formatTokenAmount(raw, 18),
          };
        },
      },
      {
        id: "dailyRate",
        label: "Daily Rate",
        description: "dailyRate() — global",
        requiresAddress: false,
        run: async () => ({
          percentPerDay: `${dailyRatePercent}%`,
        }),
      },
      {
        id: "tokenPrice",
        label: "Token Price Sources",
        description: "tokenPriceUsd() & manualTokenPrice() — global",
        requiresAddress: false,
        run: async () => {
          const parsePrice = (value?: string | null) => {
            if (!value || value === "0") return null;
            try {
              const asUnits = formatUnits(BigInt(value), 18);
              const numeric = Number.parseFloat(asUnits);
              if (Number.isNaN(numeric)) return null;
              return numeric;
            } catch {
              return null;
            }
          };
          const dexPrice = parsePrice(tokenPriceUsd);
          const manualPrice = parsePrice(manualTokenPrice);
          return {
            dexPriceRaw: tokenPriceUsd ?? "0",
            manualOverrideRaw: manualTokenPrice ?? "0",
            dexPriceUsd: dexPrice,
            manualOverrideUsd: manualPrice,
          };
        },
      },
      {
        id: "totalUsers",
        label: "Total Registered Users",
        description: "getTotalUsers() — global",
        requiresAddress: false,
        run: async () => {
          const total = await fetchTotalUsers();
          return { total };
        },
      },
      {
        id: "userSummary",
        label: "User Summary",
        description: "users(address)",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const details = await fetchMemberDetails([wallet]);
          return details[0] ?? null;
        },
      },
      {
        id: "blockedStatus",
        label: "Blocked Status",
        description: "blockedUsers(address)",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const blocked = await fetchUserBlockedStatus(wallet);
          return {
            wallet,
            blocked,
            status: blocked ? "BLOCKED" : "ACTIVE",
          };
        },
      },
      {
        id: "teamSize",
        label: "Team Size",
        description: "getTeamSize(address)",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const total = await fetchTeamSize(wallet);
          return { wallet, total };
        },
      },
      {
        id: "levelIncome",
        label: "Level Income",
        description: "levelIncome(address, levelIndex)",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const income = await fetchUserLevelIncome(wallet);
          return income.map((amount, index) => ({ level: index + 1, amount }));
        },
      },
      {
        id: "bondSnapshot",
        label: "Bond Snapshot",
        description: "userBonds(address, index)",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const snapshot = await fetchUserBondSnapshot(wallet);
          return snapshot;
        },
      },
      {
        id: "stakeHistory",
        label: "Stake History",
        description: "getStakeHistory(address) filtered by stake",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const page = await fetchStakeHistory({ wallet, pageSize: 50 });
          return page;
        },
      },
      {
        id: "unstakeHistory",
        label: "Unstake History",
        description: "getStakeHistory(address) filtered by unstake",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const page = await fetchUnstakeHistory({ wallet, pageSize: 50 });
          return page;
        },
      },
      {
        id: "roiHistory",
        label: "ROI History",
        description: "roiHistory(address, index)",
        requiresAddress: true,
        run: async (wallet?: `0x${string}`) => {
          if (!wallet) throw new Error("Wallet address required");
          const history = await fetchUserRoiHistory(wallet);
          return history;
        },
      },
    ],
    [
      connectedAddress,
      dailyRatePercent,
      fetchCompanyPoolStatus,
      fetchMemberDetails,
      fetchUserBlockedStatus,
      fetchTeamSize,
      fetchTotalUsers,
      fetchUserBondSnapshot,
      fetchUserLevelIncome,
      fetchStakeHistory,
      fetchUnstakeHistory,
      fetchUserRoiHistory,
      manualTokenPrice,
      ownerAllowanceBigInt,
      ownerTokenBalanceBigInt,
      refetchTokenAllowance,
      refetchTokenBalance,
      tokenPriceUsd,
      totalStaked,
    ],
  );

  const totalStakedWei = useMemo(() => {
    if (typeof totalStaked === "bigint") return totalStaked;
    if (totalStaked == null) return 0n;
    try {
      return BigInt(totalStaked as string);
    } catch {
      return 0n;
    }
  }, [totalStaked]);

  const totalStakedDisplay = formatTokenAmount(totalStakedWei, 18);
  const poolBalanceDisplay = formatTokenAmount(companyPool.poolBalance);
  const contractBalanceDisplay = formatTokenAmount(
    companyPool.contractTokenBalance,
  );

  const ownerDisplay = useMemo(() => {
    if (ownerLoading) return "…";
    if (!ownerAddressString) return "Unknown";
    return ownerAddressString;
  }, [ownerAddressString, ownerLoading]);

  const tokenPriceSource = useMemo(() => {
    if (tokenPriceUsd && tokenPriceUsd !== "0") return tokenPriceUsd;
    if (manualTokenPrice && manualTokenPrice !== "0") return manualTokenPrice;
    return null;
  }, [manualTokenPrice, tokenPriceUsd]);

  const handleRefreshOwnerWallet = useCallback(async () => {
    if (!connectedAddress) {
      toast.error("Connect a wallet to refresh stats");
      return;
    }
    setOwnerStatsRefreshing(true);
    try {
      const results = await Promise.allSettled([
        refetchTokenBalance(),
        refetchTokenAllowance(),
      ]);
      const failed = results.some((result) => result.status === "rejected");
      if (failed) {
        toast.error("Failed to refresh owner wallet stats");
      } else {
        toast.success("Wallet stats refreshed");
      }
    } catch (error) {
      console.error("refresh owner wallet stats failed", error);
      toast.error("Failed to refresh owner wallet stats");
    } finally {
      setOwnerStatsRefreshing(false);
    }
  }, [connectedAddress, refetchTokenAllowance, refetchTokenBalance]);

  const tokenPriceDisplay = useMemo(() => {
    if (!tokenPriceSource) return "N/A";
    try {
      const units = formatUnits(BigInt(tokenPriceSource), 18);
      const numeric = Number.parseFloat(units);
      if (Number.isNaN(numeric)) return "N/A";
      return `$${numeric.toFixed(4)}`;
    } catch {
      return "N/A";
    }
  }, [tokenPriceSource]);

  const readAddressIsValid = useMemo(
    () => Boolean(normalizeAddress(readAddressInput)),
    [readAddressInput],
  );

  const handleRunReadFunction = useCallback(
    async (functionId: string) => {
      const definition = readFunctionDefs.find(
        (entry) => entry.id === functionId,
      );
      if (!definition) return;

      let wallet: `0x${string}` | undefined;
      if (definition.requiresAddress !== false) {
        const normalized = normalizeAddress(readAddressInput);
        if (!normalized) {
          toast.error("Enter a valid wallet address");
          return;
        }
        wallet = normalized as `0x${string}`;
      }

      setReadLoadingId(functionId);
      try {
        const result = await definition.run(wallet);
        const formatted = formatReadResult(result);
        setReadOutputs((prev) => ({ ...prev, [functionId]: formatted }));
        setReadErrors((prev) => ({ ...prev, [functionId]: null }));
      } catch (error) {
        console.error(`read function ${functionId} failed`, error);
        setReadErrors((prev) => ({
          ...prev,
          [functionId]:
            error instanceof Error
              ? error.message
              : "Failed to run read function",
        }));
      } finally {
        setReadLoadingId(null);
      }
    },
    [formatReadResult, readAddressInput, readFunctionDefs],
  );

  useEffect(() => {
    if (!hasPanelAccess) {
      setUsers([]);
      setTotalUsers(0);
      setPageIndex(0);
      setCompanyPool({ poolBalance: "0", contractTokenBalance: "0" });
      setManageUserAddress("");
      setManageAction(null);
      setSearchResult(null);
      setExportPayload(null);
      setRoiHistory([]);
      setRoiError(null);
      setRoiLoading(false);
      setFundAmount("");
      setOwnershipAddressInput("");
      setDailyRateInput("");
      setCompoundFrom("");
      setCompoundTo("");
      setEmergencyWithdrawAddress("");
      setEmergencyWithdrawAmount("");
      setResetUserAddress("");
      setBondExportPayload(null);
      setCopyingBondExport(false);
      setExportingBonds(false);
    }
  }, [hasPanelAccess]);

  useEffect(() => {
    if (searchResult?.address) {
      setReadAddressInput(searchResult.address);
    }
  }, [searchResult?.address]);

  useEffect(() => {
    if (!hasPanelAccess) {
      setRoiHistory([]);
      setRoiError(null);
      setRoiLoading(false);
      return;
    }
    if (!searchResult) {
      setRoiHistory([]);
      setRoiError(null);
      setRoiLoading(false);
      return;
    }
    const normalized = normalizeAddress(searchResult.address);
    if (!normalized) {
      setRoiHistory([]);
      setRoiError("Invalid wallet address");
      setRoiLoading(false);
      return;
    }

    let cancelled = false;
    setRoiLoading(true);
    setRoiError(null);

    fetchUserRoiHistory(normalized as `0x${string}`)
      .then((history) => {
        if (cancelled) return;
        setRoiHistory(history);
      })
      .catch((error) => {
        console.error("fetchUserRoiHistory failed", error);
        if (cancelled) return;
        setRoiHistory([]);
        setRoiError("Failed to load ROI history");
      })
      .finally(() => {
        if (!cancelled) setRoiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchUserRoiHistory, hasPanelAccess, searchResult]);

  useEffect(() => {
    if (!hasPanelAccess) return;
    let cancelled = false;
    setPoolLoading(true);
    fetchCompanyPoolStatus()
      .then((status) => {
        if (cancelled) return;
        setCompanyPool(status);
      })
      .catch((error) => {
        console.error("fetchCompanyPoolStatus failed", error);
        if (!cancelled) toast.error("Failed to load company pool status");
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasPanelAccess, fetchCompanyPoolStatus]);

  useEffect(() => {
    if (!hasPanelAccess) return;
    let cancelled = false;
    setTableLoading(true);
    fetchUsersBatch(pageIndex * PAGE_SIZE, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setUsers(result.items);
        setTotalUsers(result.total);
      })
      .catch((error) => {
        console.error("fetchUsersBatch failed", error);
        if (!cancelled) toast.error("Failed to load users");
        if (!cancelled) {
          setUsers([]);
          setTotalUsers(0);
        }
      })
      .finally(() => {
        if (!cancelled) setTableLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasPanelAccess, pageIndex, fetchUsersBatch]);

  const collectAllUsers = useCallback(async () => {
    const aggregated: DirectDetail[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let expectedTotal: number | null = null;

    while (true) {
      const page = await fetchUsersBatch(offset, PAGE_SIZE);
      if (expectedTotal == null) {
        expectedTotal = page.total;
      }

      if (!page.items.length) {
        break;
      }

      page.items.forEach((entry) => {
        const key = entry.address?.toLowerCase?.() ?? "";
        if (!key || seen.has(key)) return;
        seen.add(key);
        aggregated.push(entry);
      });

      offset += page.items.length;

      const targetTotal = expectedTotal ?? Number.MAX_SAFE_INTEGER;
      if (aggregated.length >= targetTotal) {
        break;
      }

      if (page.items.length < PAGE_SIZE) {
        break;
      }
    }

    return aggregated;
  }, [fetchUsersBatch]);

  const handleSearch = async () => {
    const normalized = normalizeAddress(searchValue);
    if (!normalized) {
      toast.error("Enter a valid wallet address");
      return;
    }
    setSearchLoading(true);
    try {
      const details = await fetchMemberDetails([normalized]);
      setSearchResult(details[0] ?? null);
    } catch (error) {
      console.error("fetchMemberDetails search failed", error);
      toast.error("Failed to fetch user details");
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can manage users");
      return;
    }
    const normalized = normalizeAddress(manageUserAddress);
    if (!normalized) {
      toast.error("Enter a valid wallet address to manage");
      return;
    }
    setManageAction("block");
    try {
      await blockUserOnChain(normalized as `0x${string}`);
      const latest = await fetchUserBlockedStatus(normalized as `0x${string}`);
      setManageBlockedStatus(latest);
      setManageStatusError(null);
    } catch (error) {
      console.error("blockUserOnChain failed", error);
    } finally {
      setManageAction(null);
    }
  };

  const handleUnblockUser = async () => {
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can manage users");
      return;
    }
    const normalized = normalizeAddress(manageUserAddress);
    if (!normalized) {
      toast.error("Enter a valid wallet address to manage");
      return;
    }
    setManageAction("unblock");
    try {
      await unblockUserOnChain(normalized as `0x${string}`);
      const latest = await fetchUserBlockedStatus(normalized as `0x${string}`);
      setManageBlockedStatus(latest);
      setManageStatusError(null);
    } catch (error) {
      console.error("unblockUserOnChain failed", error);
    } finally {
      setManageAction(null);
    }
  };

  const handleCheckUserStatus = async () => {
    const normalized = normalizeAddress(manageUserAddress);
    if (!normalized) {
      toast.error("Enter a valid wallet address to check");
      return;
    }
    setManageStatusLoading(true);
    setManageStatusError(null);
    try {
      const status = await fetchUserBlockedStatus(normalized as `0x${string}`);
      setManageBlockedStatus(status);
    } catch (error) {
      console.error("fetchUserBlockedStatus failed", error);
      setManageBlockedStatus(null);
      setManageStatusError("Failed to fetch user status");
    } finally {
      setManageStatusLoading(false);
    }
  };

  const handleFundCompanyPool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can fund the pool");
      return;
    }

    const trimmed = fundAmount.trim();
    if (!trimmed) {
      toast.error("Enter an ETN amount");
      return;
    }

    if (Number.parseFloat(trimmed) <= 0) {
      toast.error("Enter a positive amount");
      return;
    }

    let amountWei: bigint;
    try {
      amountWei = parseEther(trimmed);
    } catch {
      toast.error("Enter a valid numeric amount");
      return;
    }

    setFundingPool(true);
    try {
      const [allowanceResult, balanceResult] = await Promise.allSettled([
        refetchTokenAllowance(),
        refetchTokenBalance(),
      ]);

      const latestAllowance =
        allowanceResult.status === "fulfilled"
          ? toBigIntOrZero(allowanceResult.value.data)
          : ownerAllowanceBigInt;
      const latestBalance =
        balanceResult.status === "fulfilled"
          ? toBigIntOrZero(balanceResult.value.data)
          : ownerTokenBalanceBigInt;

      if (latestBalance < amountWei) {
        toast.error(
          `Owner wallet balance is ${formatTokenAmount(
            latestBalance,
          )} ETN, which is below the requested amount.`,
        );
        return;
      }

      if (latestAllowance < amountWei) {
        toast.error(
          `Allowance to the contract is ${formatTokenAmount(
            latestAllowance,
          )} ETN. Approve at least ${trimmed} ETN before funding.`,
        );
        return;
      }

      await fundCompanyPool(trimmed);
      setFundAmount("");
      const status = await fetchCompanyPoolStatus();
      setCompanyPool(status);
      await Promise.allSettled([
        refetchTokenAllowance(),
        refetchTokenBalance(),
      ]);
    } catch (error) {
      console.error("fundCompanyPool failed", error);
    } finally {
      setFundingPool(false);
    }
  };

  const handleTransferOwnership = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwnerAccount) {
      toast.error("Only the current owner can transfer ownership");
      return;
    }

    const normalized = normalizeAddress(ownershipAddressInput);
    if (!normalized) {
      toast.error("Enter a valid wallet address");
      return;
    }

    if (
      ownerAddressString &&
      normalized.toLowerCase() === ownerAddressString.toLowerCase()
    ) {
      toast.error("Address is already the owner");
      return;
    }

    setTransferringOwnership(true);
    try {
      await transferOwnership(normalized as `0x${string}`);
      setOwnershipAddressInput("");
      try {
        await refetchOwner?.();
      } catch {
        // ignore refetch failures; wagmi will update eventually
      }
    } catch (error) {
      console.error("transferOwnership failed", error);
    } finally {
      setTransferringOwnership(false);
    }
  };

  const handleSetDailyRate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can update the daily rate");
      return;
    }

    const trimmed = dailyRateInput.trim();
    if (!trimmed) {
      toast.error("Enter a daily rate percentage");
      return;
    }

    setUpdatingDailyRate(true);
    try {
      await setDailyRatePercent(trimmed);
      setDailyRateInput("");
    } catch (error) {
      console.error("setDailyRatePercent failed", error);
    } finally {
      setUpdatingDailyRate(false);
    }
  };

  const handleBatchCompound = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can compound all users");
      return;
    }

    const from = Number.parseInt(compoundFrom.trim(), 10);
    const to = Number.parseInt(compoundTo.trim(), 10);

    if (!Number.isInteger(from) || from < 0) {
      toast.error("Enter a valid start index");
      return;
    }

    if (!Number.isInteger(to) || to <= from) {
      toast.error("End index must be greater than start index");
      return;
    }

    setCompoundingRange(true);
    try {
      await batchCompoundAllUsers(from, to);
      setCompoundFrom("");
      setCompoundTo("");
    } catch (error) {
      console.error("batchCompoundAllUsers failed", error);
    } finally {
      setCompoundingRange(false);
    }
  };

  const handleEmergencyWithdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can withdraw funds");
      return;
    }

    const normalized = normalizeAddress(emergencyWithdrawAddress);
    if (!normalized) {
      toast.error("Enter a valid target wallet");
      return;
    }

    const amount = emergencyWithdrawAmount.trim();
    if (!amount) {
      toast.error("Enter an ETN amount");
      return;
    }

    setWithdrawingEmergency(true);
    try {
      await emergencyWithdrawTokens(normalized as `0x${string}`, amount);
      setEmergencyWithdrawAmount("");
      setEmergencyWithdrawAddress("");
    } catch (error) {
      console.error("emergencyWithdrawTokens failed", error);
    } finally {
      setWithdrawingEmergency(false);
    }
  };

  const handleEmergencyResetUser = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!isOwnerAccount) {
      toast.error("Only the contract owner can reset user data");
      return;
    }

    const normalized = normalizeAddress(resetUserAddress);
    if (!normalized) {
      toast.error("Enter a valid wallet address");
      return;
    }

    setResettingUser(true);
    try {
      await emergencyResetUser(normalized as `0x${string}`);
      setResetUserAddress("");
    } catch (error) {
      console.error("emergencyResetUser failed", error);
    } finally {
      setResettingUser(false);
    }
  };

  const handleRefreshRoiHistory = async () => {
    if (!searchResult) return;
    const normalized = normalizeAddress(searchResult.address);
    if (!normalized) {
      setRoiHistory([]);
      setRoiError("Invalid wallet address");
      return;
    }

    setRoiLoading(true);
    setRoiError(null);
    try {
      const history = await fetchUserRoiHistory(normalized as `0x${string}`);
      setRoiHistory(history);
    } catch (error) {
      console.error("handleRefreshRoiHistory failed", error);
      setRoiHistory([]);
      setRoiError("Failed to load ROI history");
    } finally {
      setRoiLoading(false);
    }
  };

  const handleExportCalldata = async () => {
    if (exportingUsers) return;
    setExportingUsers(true);
    try {
      const aggregated = await collectAllUsers();

      const payload = {
        users_: aggregated.map((entry) => entry.address),
        originalStaked_: aggregated.map((entry) => entry.originalStaked ?? "0"),
        selfStaked_: aggregated.map((entry) => entry.selfStaked ?? "0"),
        referrers_: aggregated.map(
          (entry) =>
            entry.referrer ?? "0x0000000000000000000000000000000000000000",
        ),
        lastAccruedAt_: aggregated.map((entry) => entry.lastAccruedAt ?? "0"),
        directs_: aggregated.map((entry) => entry.directs.toString()),
      };

      setExportPayload(JSON.stringify(payload, null, 2));
      toast.success("Calldata arrays ready");
    } catch (error) {
      console.error("handleExportCalldata failed", error);
      toast.error("Failed to build calldata arrays");
    } finally {
      setExportingUsers(false);
    }
  };

  const handleCopyExportPayload = async () => {
    if (!exportPayload || copyingExport) return;
    try {
      setCopyingExport(true);
      await navigator.clipboard.writeText(exportPayload);
      toast.success("Copied calldata arrays");
    } catch (error) {
      console.error("copy export payload failed", error);
      toast.error("Failed to copy arrays");
    } finally {
      setCopyingExport(false);
    }
  };

  const handleExportBondCalldata = async () => {
    if (exportingBonds) return;
    setExportingBonds(true);
    try {
      const aggregated = await collectAllUsers();
      const entries: Array<{
        user: string;
        planIds: number[];
        principals: string[];
        rewards: string[];
        startAts: string[];
        withdrawnFlags: boolean[];
      }> = [];

      for (const detail of aggregated) {
        const normalized = normalizeAddress(detail.address);
        if (!normalized) continue;
        try {
          const snapshot = await fetchUserBondSnapshot(
            normalized as `0x${string}`,
          );
          if (snapshot.planIds.length === 0) continue;
          entries.push({
            user: normalized,
            planIds: snapshot.planIds,
            principals: snapshot.principals,
            rewards: snapshot.rewards,
            startAts: snapshot.startAts,
            withdrawnFlags: snapshot.withdrawnFlags,
          });
        } catch (error) {
          console.error("fetchUserBondSnapshot failed", detail.address, error);
        }
      }

      setBondExportPayload(JSON.stringify(entries, null, 2));
      toast.success(
        entries.length ? "Bond calldata ready" : "No bonds found to export",
      );
    } catch (error) {
      console.error("handleExportBondCalldata failed", error);
      toast.error("Failed to build bond calldata");
    } finally {
      setExportingBonds(false);
    }
  };

  const handleCopyBondExport = async () => {
    if (!bondExportPayload || copyingBondExport) return;
    try {
      setCopyingBondExport(true);
      await navigator.clipboard.writeText(bondExportPayload);
      toast.success("Copied bond calldata");
    } catch (error) {
      console.error("copy bond export payload failed", error);
      toast.error("Failed to copy bond arrays");
    } finally {
      setCopyingBondExport(false);
    }
  };

  const pageStart = totalUsers === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const pageEnd =
    totalUsers === 0 ? 0 : Math.min(totalUsers, (pageIndex + 1) * PAGE_SIZE);
  const totalPages = totalUsers === 0 ? 0 : Math.ceil(totalUsers / PAGE_SIZE);
  const hasNextPage = (pageIndex + 1) * PAGE_SIZE < totalUsers;

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-gray-300">
          Connect your wallet to access the admin panel.
        </p>
      </div>
    );
  }

  if (ownerLoading || (!ownerAddressString && connectedAddress)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-gray-300">Verifying admin access…</p>
      </div>
    );
  }

  if (!hasPanelAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-red-400">
          Access restricted to the contract owner or approved admin wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bread-shape">
        <div className="breadcrumb-bg"></div>
      </div>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Admin Control Center
            </h1>
            <p className="text-sm text-gray-400">
              Overview of all ETHAN users and contract health. Access is limited
              to the owner and approved admin wallets.
            </p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-900/80 border border-yellow-500/20 rounded px-3 py-2">
            <div>Connected Admin</div>
            <div className="text-yellow-400 break-all">{connectedAddress}</div>
          </div>
        </div>

        {!isOwnerAccount ? (
          <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
            Write operations require the contract owner wallet; read-only
            features remain available.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Total Registered Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow-400">
                {tableLoading && totalUsers === 0
                  ? "…"
                  : totalUsers.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Total ETN Staked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow-400">
                {totalStakedDisplay} ETN
              </p>
            </CardContent>
          </Card>
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                ETN Token Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-yellow-400">
                {tokenPriceDisplay}
              </p>
            </CardContent>
          </Card>
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-400">
                Company Valuation Pool
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-yellow-500/40 text-yellow-400"
                onClick={() => {
                  setPoolLoading(true);
                  fetchCompanyPoolStatus()
                    .then(setCompanyPool)
                    .catch((error) => {
                      console.error("refresh pool status failed", error);
                      toast.error("Failed to refresh pool status");
                    })
                    .finally(() => setPoolLoading(false));
                }}
                disabled={poolLoading}
              >
                {poolLoading ? "Refreshing…" : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Logical Pool Balance</span>
                <span className="text-yellow-400">
                  {poolBalanceDisplay} ETN
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Token Balance on Contract</span>
                <span className="text-yellow-400">
                  {contractBalanceDisplay} ETN
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Fund Company Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleFundCompanyPool}>
                <Input
                  placeholder="Amount in ETN"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  disabled={fundingPool || !isOwnerAccount}
                  className="input-bg border-gray-700 text-white"
                />
                <Button
                  type="submit"
                  className="bg-yellow-500 text-black font-semibold"
                  disabled={fundingPool || !isOwnerAccount}
                >
                  {fundingPool ? "Funding…" : "Fund Pool"}
                </Button>
                <div className="rounded border border-yellow-500/10 bg-gray-900/50 p-3 text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Connected Wallet</span>
                    <span className="text-yellow-400">
                      {connectedAddress ? connectedAddress : "Not connected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wallet Balance</span>
                    <span className="text-yellow-400">
                      {ownerTokenBalanceDisplay} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allowance to Contract</span>
                    <span className="text-yellow-400">
                      {ownerAllowanceDisplay} ETN
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 border-yellow-500/40 text-yellow-300"
                    onClick={handleRefreshOwnerWallet}
                    disabled={ownerStatsRefreshing}
                  >
                    {ownerStatsRefreshing
                      ? "Refreshing…"
                      : "Refresh Wallet Stats"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Transfers ETN from the owner wallet into the company valuation
                  pool.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Transfer Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-500">
                <div>Current Owner</div>
                <div className="text-yellow-400 break-all">{ownerDisplay}</div>
              </div>
              <form className="space-y-3" onSubmit={handleTransferOwnership}>
                <Input
                  placeholder="New owner wallet (0x…)"
                  value={ownershipAddressInput}
                  onChange={(event) =>
                    setOwnershipAddressInput(event.target.value)
                  }
                  disabled={transferringOwnership || !isOwnerAccount}
                  className="input-bg border-gray-700 text-white"
                />
                <Button
                  type="submit"
                  className="bg-yellow-500 text-black font-semibold"
                  disabled={transferringOwnership || !isOwnerAccount}
                >
                  {transferringOwnership ? "Transferring…" : "Transfer"}
                </Button>
                <p className="text-xs text-gray-500">
                  Executes the contract ownership transfer transaction.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Update Daily Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 mb-3">
                <div>Current Daily Rate</div>
                <div className="text-yellow-400 text-base">
                  {dailyRatePercent}%
                </div>
              </div>
              <form className="space-y-3" onSubmit={handleSetDailyRate}>
                <Input
                  placeholder="Daily rate (%)"
                  value={dailyRateInput}
                  onChange={(event) => setDailyRateInput(event.target.value)}
                  disabled={updatingDailyRate || !isOwnerAccount}
                  className="input-bg border-gray-700 text-white"
                />
                <Button
                  type="submit"
                  className="bg-yellow-500 text-black font-semibold"
                  disabled={updatingDailyRate || !isOwnerAccount}
                >
                  {updatingDailyRate ? "Updating…" : "Update"}
                </Button>
                <p className="text-xs text-gray-500">
                  Enter the daily ROI percentage (e.g. 0.8 for 0.8%).
                </p>
              </form>
            </CardContent>
          </Card>

          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Batch Compound Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleBatchCompound}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="From index"
                    value={compoundFrom}
                    onChange={(event) => setCompoundFrom(event.target.value)}
                    disabled={compoundingRange || !isOwnerAccount}
                    className="input-bg border-gray-700 text-white"
                  />
                  <Input
                    placeholder="To index"
                    value={compoundTo}
                    onChange={(event) => setCompoundTo(event.target.value)}
                    disabled={compoundingRange || !isOwnerAccount}
                    className="input-bg border-gray-700 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-yellow-500 text-black font-semibold"
                  disabled={compoundingRange || !isOwnerAccount}
                >
                  {compoundingRange ? "Compounding…" : "Compound"}
                </Button>
                <p className="text-xs text-gray-500">
                  Applies auto-compounding for users within the specified index
                  range (exclusive upper bound).
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Emergency Withdraw
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleEmergencyWithdraw}>
                <Input
                  placeholder="Recipient wallet (0x…)"
                  value={emergencyWithdrawAddress}
                  onChange={(event) =>
                    setEmergencyWithdrawAddress(event.target.value)
                  }
                  disabled={withdrawingEmergency || !isOwnerAccount}
                  className="input-bg border-gray-700 text-white"
                />
                <Input
                  placeholder="Amount in ETN"
                  value={emergencyWithdrawAmount}
                  onChange={(event) =>
                    setEmergencyWithdrawAmount(event.target.value)
                  }
                  disabled={withdrawingEmergency || !isOwnerAccount}
                  className="input-bg border-gray-700 text-white"
                />
                <Button
                  type="submit"
                  className="bg-yellow-500 text-black font-semibold"
                  disabled={withdrawingEmergency || !isOwnerAccount}
                >
                  {withdrawingEmergency ? "Withdrawing…" : "Withdraw"}
                </Button>
                <p className="text-xs text-gray-500">
                  Transfers ETN from the contract to the specified address.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">
                Reset User (Emergency)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleEmergencyResetUser}>
                <Input
                  placeholder="User wallet (0x…)"
                  value={resetUserAddress}
                  onChange={(event) => setResetUserAddress(event.target.value)}
                  disabled={resettingUser || !isOwnerAccount}
                  className="input-bg border-gray-700 text-white"
                />
                <Button
                  type="submit"
                  className="bg-yellow-500 text-black font-semibold"
                  disabled={resettingUser || !isOwnerAccount}
                >
                  {resettingUser ? "Resetting…" : "Reset User"}
                </Button>
                <p className="text-xs text-gray-500">
                  Clears on-chain stake balances for troubleshooting.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-400">
              Search User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <Input
                placeholder="Wallet address (0x…)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 input-bg border-gray-700 text-white"
              />
              <Button
                type="submit"
                className="bg-yellow-500 text-black font-semibold"
                disabled={searchLoading}
              >
                {searchLoading ? "Searching…" : "Search"}
              </Button>
            </form>

            {searchResult && (
              <div className="input-bg border border-yellow-500/20 rounded-lg p-4 space-y-3">
                <div className="text-xs text-gray-300 uppercase tracking-wide">
                  Wallet Address
                </div>
                <div className="text-sm text-yellow-300 break-all">
                  {searchResult.address}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Original Staked</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.originalStaked)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Original USD Locked</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.originalUsdLocked)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Self Staked</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.selfStaked)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Self Staked USD Locked</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.selfStakedUsdLocked)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Bond Value</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.activeBondValue)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stake + Accrued</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.stakeWithAccrued)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending ROI</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.pendingRoi)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total ROI Earned</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.totalRoiEarned)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Level Reward</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.totalLevelRewardEarned)}{" "}
                      ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Referral Income</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.totalReferralIncome)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latest Referral Reward</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.referralIncome)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Withdrawn</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.totalWithdrawn)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level</span>
                    <span className="text-yellow-300 font-medium">
                      {searchResult.level || "-"}
                    </span>
                  </div>
                  {searchResult.rank != null && (
                    <div className="flex justify-between">
                      <span>Rank</span>
                      <span className="text-yellow-300 font-medium">
                        L{searchResult.rank}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Referrer</span>
                    <span
                      className="text-yellow-300 font-medium"
                      title={searchResult.referrer}
                    >
                      {searchResult.referrerShort}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Accrued</span>
                    <span className="text-yellow-300 font-medium">
                      {searchResult.lastAccruedAt ?? "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Directs</span>
                    <span className="text-yellow-300 font-medium">
                      {searchResult.directs.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {searchResult && (
          <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg text-yellow-400">
                ROI History
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                className="border-yellow-500/40 text-yellow-400"
                onClick={handleRefreshRoiHistory}
                disabled={roiLoading}
              >
                {roiLoading ? "Loading…" : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent>
              {roiError ? (
                <p className="text-sm text-red-400">{roiError}</p>
              ) : roiLoading ? (
                <p className="text-sm text-gray-400">Loading ROI history…</p>
              ) : roiHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No ROI history entries.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800">
                        <th className="py-2 pr-4">Day</th>
                        <th className="py-2 pr-4">Timestamp (s)</th>
                        <th className="py-2">Amount (ETN)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roiHistory.map((entry, index) => (
                        <tr
                          key={`${entry.day}-${entry.timestamp}-${index}`}
                          className="border-b border-gray-900/80"
                        >
                          <td className="py-3 pr-4 text-gray-200">
                            {entry.day}
                          </td>
                          <td className="py-3 pr-4 text-gray-200">
                            {entry.timestamp}
                          </td>
                          <td className="py-3 text-yellow-200">
                            {formatTokenAmount(entry.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-400">
              Read Function Explorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="text-xs text-gray-300 uppercase tracking-wide">
                Target Wallet (optional for global reads)
              </div>
              <Input
                placeholder="Wallet address (0x…)"
                value={readAddressInput}
                onChange={(event) => setReadAddressInput(event.target.value)}
                className="input-bg border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">
                Enter a wallet to inspect address-specific reads. Functions
                without wallet requirements can be run immediately.
              </p>
            </div>

            <div className="space-y-6">
              {readFunctionDefs.map((def) => {
                const isRunning = readLoadingId === def.id;
                const errorMessage = readErrors[def.id] ?? null;
                const output = readOutputs[def.id] ?? "";
                const requiresAddress = def.requiresAddress !== false;
                const shouldDisable =
                  (requiresAddress && !readAddressIsValid) || isRunning;
                return (
                  <div
                    key={def.id}
                    className="rounded-lg border border-yellow-500/20 bg-gray-950/60 p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="text-sm text-yellow-300 font-semibold">
                          {def.label}
                        </div>
                        <div className="text-xs text-gray-400">
                          {def.description}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-400"
                        onClick={() => handleRunReadFunction(def.id)}
                        disabled={shouldDisable}
                      >
                        {isRunning ? "Running…" : "Run"}
                      </Button>
                    </div>
                    {errorMessage ? (
                      <p className="text-xs text-red-400">{errorMessage}</p>
                    ) : null}
                    {output ? (
                      <pre className="max-h-64 overflow-auto rounded bg-black/40 p-3 text-xs text-yellow-200 whitespace-pre-wrap">
                        {output}
                      </pre>
                    ) : null}
                    {!output && !errorMessage ? (
                      <p className="text-xs text-gray-500">
                        Run to view the latest response.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-400">
              User Access Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-gray-300 uppercase tracking-wide">
                Target Wallet
              </div>
              <Input
                placeholder="Wallet address (0x…)"
                value={manageUserAddress}
                onChange={(event) => setManageUserAddress(event.target.value)}
                className="input-bg border-gray-700 text-white"
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs">
                  <span className="text-gray-400">Status:</span>{" "}
                  {manageStatusLoading ? (
                    <span className="text-gray-300">Checking…</span>
                  ) : manageStatusError ? (
                    <span className="text-red-400">{manageStatusError}</span>
                  ) : manageBlockedStatus === null ? (
                    <span className="text-gray-500">Unknown</span>
                  ) : manageBlockedStatus ? (
                    <span className="text-red-400 font-semibold">Blocked</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400"
                  onClick={handleCheckUserStatus}
                  disabled={!manageAddressIsValid || manageBusy}
                >
                  {manageStatusLoading ? "Checking…" : "Check status"}
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                onClick={handleBlockUser}
                disabled={
                  !manageAddressIsValid ||
                  manageBusy ||
                  !isOwnerAccount ||
                  manageBlockedStatus === true
                }
              >
                {manageAction === "block" ? "Blocking…" : "Block User"}
              </Button>
              <Button
                type="button"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                onClick={handleUnblockUser}
                disabled={
                  !manageAddressIsValid ||
                  manageBusy ||
                  !isOwnerAccount ||
                  manageBlockedStatus === false
                }
              >
                {manageAction === "unblock" ? "Unblocking…" : "Unblock User"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Blocking prevents a wallet from staking, compounding, or claiming
              rewards until you unblock it again.
            </p>
          </CardContent>
        </Card>

        <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg text-yellow-400">
                Registered Users
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <div className="text-xs text-gray-400">
                  {totalUsers === 0
                    ? "No users registered."
                    : `Showing ${pageStart}-${pageEnd} of ${totalUsers.toLocaleString()} users`}
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-400"
                    disabled={exportingUsers || totalUsers === 0}
                    onClick={handleExportCalldata}
                  >
                    {exportingUsers ? "Building…" : "Build calldata arrays"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-400"
                    disabled={exportingBonds || totalUsers === 0}
                    onClick={handleExportBondCalldata}
                  >
                    {exportingBonds ? "Collecting…" : "Build bond calldata"}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4">Referrer</th>
                  <th className="py-2 pr-4">Directs</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Last Accrued</th>
                  <th className="py-2 pr-4">Original Staked (ETN)</th>
                  <th className="py-2 pr-4">Original USD Locked (ETN)</th>
                  <th className="py-2 pr-4">Self Staked (ETN)</th>
                  <th className="py-2 pr-4">Self Staked USD Locked (ETN)</th>
                  <th className="py-2 pr-4">Active Bond (ETN)</th>
                  <th className="py-2 pr-4">Stake + Accrued (ETN)</th>
                  <th className="py-2 pr-4">Pending ROI (ETN)</th>
                  <th className="py-2 pr-4">Total ROI Earned (ETN)</th>
                  <th className="py-2 pr-4">Total Level Reward (ETN)</th>
                  <th className="py-2 pr-4">Latest Referral (ETN)</th>
                  <th className="py-2 pr-4">Total Referral (ETN)</th>
                  <th className="py-2">Total Withdrawn (ETN)</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={18} className="py-6 text-center text-gray-500">
                      Loading users…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-6 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const highlight =
                      searchResult &&
                      searchResult.address.toLowerCase() ===
                        user.address.toLowerCase();
                    return (
                      <tr
                        key={user.address}
                        className={`border-b border-gray-900/80 ${
                          highlight ? "bg-yellow-500/10" : ""
                        }`}
                      >
                        <td className="py-3 pr-4 text-yellow-300 break-all">
                          {user.address}
                        </td>
                        <td
                          className="py-3 pr-4 text-gray-200 break-all"
                          title={user.referrer}
                        >
                          {user.referrerShort}
                        </td>
                        <td className="py-3 pr-4 text-gray-200">
                          {user.directs.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-gray-200">
                          {user.level || "-"}
                        </td>
                        <td className="py-3 pr-4 text-gray-200">
                          {user.rank ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {user.lastAccruedAt ?? "0"}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.originalStaked)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.originalUsdLocked)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.selfStaked)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.selfStakedUsdLocked)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.activeBondValue)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.stakeWithAccrued)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.pendingRoi)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.totalRoiEarned)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.totalLevelRewardEarned)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.referralIncome)}
                        </td>
                        <td className="py-3 text-yellow-200">
                          {formatTokenAmount(user.totalReferralIncome)}
                        </td>
                        <td className="py-3 text-yellow-200">
                          {formatTokenAmount(user.totalWithdrawn)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <div>
                Page {totalPages === 0 ? 0 : pageIndex + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400"
                  disabled={!hasNextPage}
                  onClick={() => {
                    if (hasNextPage) setPageIndex((prev) => prev + 1);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
            {exportPayload && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    Calldata Arrays
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-500/40 text-yellow-400"
                    onClick={handleCopyExportPayload}
                    disabled={copyingExport}
                  >
                    {copyingExport ? "Copying…" : "Copy JSON"}
                  </Button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto rounded border border-yellow-500/20 bg-gray-950/60 p-3 text-xs text-yellow-200">
                  {exportPayload}
                </pre>
              </div>
            )}
            {bondExportPayload && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    Bond Calldata
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-500/40 text-yellow-400"
                    onClick={handleCopyBondExport}
                    disabled={copyingBondExport}
                  >
                    {copyingBondExport ? "Copying…" : "Copy JSON"}
                  </Button>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto rounded border border-yellow-500/20 bg-gray-950/60 p-3 text-xs text-yellow-200">
                  {bondExportPayload}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
