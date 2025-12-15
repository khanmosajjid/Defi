import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { formatUnits } from "viem";

import { CONTRACT_ADDRESSES } from "@/lib/constants";
import {
  useStakingContract,
  type DirectDetail,
} from "@/service/stakingService";
import CONTRACT_ABI from "@/service/stakingABI.json";

const PAGE_SIZE = 25;

function formatTokenAmount(
  value?: string | bigint | null,
  decimals = 18,
  precision = 4
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
      ","
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

const Admin = () => {
  const { address: connectedAddress } = useAccount();
  const { data: ownerAddress, isLoading: ownerLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.stakingPlatform as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });

  const isAdmin = useMemo(() => {
    if (!connectedAddress || !ownerAddress) return false;
    return ownerAddress.toLowerCase() === connectedAddress.toLowerCase();
  }, [connectedAddress, ownerAddress]);

  const {
    totalStaked,
    fetchUsersBatch,
    fetchMemberDetails,
    fetchCompanyPoolStatus,
  } = useStakingContract();

  const [pageIndex, setPageIndex] = useState(0);
  const [users, setUsers] = useState<DirectDetail[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [companyPool, setCompanyPool] = useState({
    poolBalance: "0",
    contractTokenBalance: "0",
  });

  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<DirectDetail | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const totalStakedDisplay = formatTokenAmount(totalStaked ?? null);
  const poolBalanceDisplay = formatTokenAmount(companyPool.poolBalance);
  const contractBalanceDisplay = formatTokenAmount(
    companyPool.contractTokenBalance
  );

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      setTotalUsers(0);
      setPageIndex(0);
      setCompanyPool({ poolBalance: "0", contractTokenBalance: "0" });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin, fetchCompanyPoolStatus]);

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin, pageIndex, fetchUsersBatch]);

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

  if (ownerLoading || (!ownerAddress && connectedAddress)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-gray-300">Verifying admin access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-red-400">
          Access restricted to the contract admin.
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
              Overview of all ETHAN users and contract health. Only the contract
              owner can access this page.
            </p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-900/80 border border-yellow-500/20 rounded px-3 py-2">
            <div>Connected Admin</div>
            <div className="text-yellow-400 break-all">{connectedAddress}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Self Staked</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.selfStaked)} ETN
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
                    <span>Total Referral Income</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.totalReferralIncome)} ETN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level</span>
                    <span className="text-yellow-300 font-medium">
                      {searchResult.level || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latest Referral Reward</span>
                    <span className="text-yellow-300 font-medium">
                      {formatTokenAmount(searchResult.referralIncome)} ETN
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-box from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg text-yellow-400">
              Registered Users
            </CardTitle>
            <div className="text-xs text-gray-400">
              {totalUsers === 0
                ? "No users registered."
                : `Showing ${pageStart}-${pageEnd} of ${totalUsers.toLocaleString()} users`}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Self Staked (ETN)</th>
                  <th className="py-2 pr-4">Stake + Accrued (ETN)</th>
                  <th className="py-2 pr-4">Pending ROI (ETN)</th>
                  <th className="py-2 pr-4">Latest Referral (ETN)</th>
                  <th className="py-2">Total Referral (ETN)</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      Loading users…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
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
                        <td className="py-3 pr-4 text-gray-200">
                          {user.level || "-"}
                        </td>
                        <td className="py-3 pr-4 text-gray-200">
                          {user.rank ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.selfStaked)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.stakeWithAccrued)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.pendingRoi)}
                        </td>
                        <td className="py-3 pr-4 text-yellow-200">
                          {formatTokenAmount(user.referralIncome)}
                        </td>
                        <td className="py-3 text-yellow-200">
                          {formatTokenAmount(user.totalReferralIncome)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
