import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import type { Abi } from 'abitype';
import { toast } from 'react-hot-toast';
import { parseAbiItem, parseEther } from 'viem';
import { readContract, getPublicClient } from '@wagmi/core';

import { writeAndWaitForReceipt } from '@/lib/wagmiWrite';
import { CONTRACT_ADDRESSES, DEFAULT_REFERRER, RANK_NAMES } from '@/lib/constants';
import CONTRACT_ABI from '@/service/stakingABI.json';
import { config } from '@/lib/wagmiConfig';

const ERC20_ABI = [
    { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' },
    { constant: true, inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }], name: 'allowance', outputs: [{ name: 'remaining', type: 'uint256' }], type: 'function' },
    { constant: false, inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: 'success', type: 'bool' }], type: 'function' },
];

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.stakingPlatform as `0x${string}`;
const TOKEN_ADDRESS = CONTRACT_ADDRESSES.token as `0x${string}`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const APPROVE_AMOUNT = 1_000_000n * 10n ** 18n;
const ONE_TOKEN = 10n ** 18n;
function resolveReferrerAddress(
    candidates: Array<string | undefined | null>,
    self?: string | null
): `0x${string}` {
    const selfLower = self?.toLowerCase();
    const zeroLower = ZERO_ADDRESS.toLowerCase();
    for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'string') continue;
        if (!candidate.startsWith('0x')) continue;
        const lower = candidate.toLowerCase();
        if (lower === zeroLower) continue;
        if (selfLower && lower === selfLower) continue;
        return candidate as `0x${string}`;
    }
    return DEFAULT_REFERRER;
}

function readContractSafe<T = unknown>(params: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return readContract(config, params as any) as Promise<T>;
}

type ActivityKind =
    | 'STAKE'
    | 'UNSTAKE'
    | 'COMPOUND'
    | 'CLAIM'
    | 'REFERRAL_IN'
    | 'REFERRAL_OUT'
    | 'BOND_BUY'
    | 'BOND_WITHDRAW'
    | 'LEVEL'
    | 'RANK'
    | 'TOKEN_TRANSFER_IN'
    | 'TOKEN_TRANSFER_OUT'
    | 'TOKEN_APPROVAL';

type ActivityItem = {
    kind: ActivityKind;
    txHash: string;
    blockNumber: number;
    timestamp?: number;
    amount?: string;
    counterparty?: string;
    meta?: Record<string, unknown>;
};

type DirectDetail = {
    address: string;
    selfStaked: string;
    stakeWithAccrued: string;
    pendingRoi: string;
    level: number;
    referralIncome: string;
};

function mapChainId(input: number | undefined): 1 | 10 | 97 | 137 | 42161 | 8453 {
    switch (input) {
        case 1:
        case 10:
        case 97:
        case 137:
        case 42161:
        case 8453:
            return input;
        default:
            return 97;
    }
}

function shortenAddress(addr?: string | null) {
    if (!addr) return '';
    if (addr === ZERO_ADDRESS) return 'No referrer';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toStr(v: unknown): string | undefined {
    if (v == null) return undefined;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint') return v.toString();
    try {
        return String(v);
    } catch {
        return undefined;
    }
}

function toNum(v: unknown): number | undefined {
    if (v == null) return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isNaN(n) ? undefined : n;
    }
    return undefined;
}

function extractString(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint') return v.toString();
    if (typeof v === 'object' && 'toString' in v) {
        try {
            return (v as { toString: () => string }).toString();
        } catch {
            return null;
        }
    }
    return null;
}

function formatUnits(raw?: string | number | bigint | null, decimals = 18) {
    if (raw == null) return '0';
    try {
        const s = raw.toString();
        const value = BigInt(s);
        const base = 10n ** BigInt(decimals);
        const whole = value / base;
        const fraction = value % base;
        if (fraction === 0n) return whole.toString();
        const fracStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
        return `${whole.toString()}.${fracStr}`;
    } catch {
        return raw.toString();
    }
}

function getRankName(rank: number | null | undefined) {
    if (!rank || rank <= 0) return null;
    const key = rank as keyof typeof RANK_NAMES;
    return RANK_NAMES[key] ?? `Rank ${rank}`;
}

export function useStakingContract() {
    const { address } = useAccount();
    const chainId = useChainId();

    const supportedChainId = useMemo(() => mapChainId(chainId), [chainId]);

    const publicClient = useMemo(() => {
        try {
            return getPublicClient(config, { chainId: supportedChainId });
        } catch (error) {
            console.error('publicClient error', error);
            return null;
        }
    }, [supportedChainId]);

    const [directsList, setDirectsList] = useState<string[]>([]);
    const [directsWithBalances, setDirectsWithBalances] = useState<DirectDetail[]>([]);
    const [loadingDirects, setLoadingDirects] = useState(false);
    const [teamSize, setTeamSize] = useState<number>(0);

    function getErrorMessage(err: unknown) {
        if (!err) return 'Unknown error';
        if (err instanceof Error) return err.message;
        if (typeof err === 'string') return err;
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }

    const { data: totalStakedRaw, refetch: refetchTotalStaked } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CONTRACT_ADDRESS],
    });

    const { data: userInfoRaw, refetch: refetchUserInfo } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'users',
        args: [address ?? ZERO_ADDRESS],
        query: { enabled: Boolean(address) },
    });

    const { data: manualTokenPriceRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'manualTokenPrice',
    });

    const { data: tokenPricePerTokenRaw, refetch: refetchTokenPrice } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'tokenToUsd18',
        args: [ONE_TOKEN],
    });

    const { data: dailyRateRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'dailyRate',
    });

    const { data: tokenBalanceRaw, refetch: refetchTokenBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address ?? ZERO_ADDRESS],
        query: { enabled: Boolean(address) },
    });

    const { data: tokenAllowanceRaw, refetch: refetchTokenAllowance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address ?? ZERO_ADDRESS, CONTRACT_ADDRESS],
        query: { enabled: Boolean(address) },
    });

    const { data: userReportRaw, refetch: refetchUserReport } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getUserReport',
        args: [address ?? ZERO_ADDRESS],
        query: { enabled: Boolean(address) },
    });

    const userInfo = useMemo(() => {
        if (!userInfoRaw) return null;
        const arr = userInfoRaw as unknown[];
        const levelRaw = extractString(arr[8]) ?? '0';
        let level = 0;
        try {
            const lvl = BigInt(levelRaw);
            if (lvl !== 255n) level = Number(lvl);
        } catch {
            level = 0;
        }
        const rankValue = Number(extractString(arr[9]) ?? '0');
        return {
            originalStaked: extractString(arr[0]) ?? '0',
            originalUsdLocked: extractString(arr[1]) ?? '0',
            selfStaked: extractString(arr[2]) ?? '0',
            selfStakedUsdLocked: extractString(arr[3]) ?? '0',
            activeBondValue: extractString(arr[4]) ?? '0',
            lastAccruedAt: extractString(arr[5]) ?? '0',
            referrer: (arr[6] as string) ?? ZERO_ADDRESS,
            referrerShort: shortenAddress(arr[6] as string),
            directs: Number(extractString(arr[7]) ?? '0'),
            level,
            rank: rankValue,
            rankName: getRankName(rankValue),
            totalRoiEarned: extractString(arr[10]) ?? '0',
            totalLevelRewardEarned: extractString(arr[11]) ?? '0',
            totalReferralIncome: extractString(arr[12]) ?? '0',
            totalWithdrawn: extractString(arr[13]) ?? '0',
        };
    }, [userInfoRaw]);

    const userReport = useMemo(() => {
        if (!userReportRaw && !userInfo) return null;
        const arr = (userReportRaw as unknown[]) || [];
        const pendingRoi = extractString(arr[0]) ?? '0';
        const stakeWithAccrued = extractString(arr[1]) ?? userInfo?.selfStaked ?? '0';
        const usdStakedLive = extractString(arr[2]) ?? '0';
        const levelRaw = extractString(arr[3]) ?? '0';
        let displayLevel = userInfo?.level ?? 0;
        try {
            const lvl = BigInt(levelRaw);
            if (lvl !== 255n) displayLevel = Number(lvl);
        } catch {
            // ignore parse errors
        }
        return {
            pendingRoi,
            stakeWithAccrued,
            usdStakedLive,
            displayLevel,
            bondCount: Number(extractString(arr[4]) ?? '0'),
            roiHistoryCount: Number(extractString(arr[5]) ?? '0'),
            totalRoiEarned: userInfo?.totalRoiEarned ?? '0',
            totalLevelRewardEarned: userInfo?.totalLevelRewardEarned ?? '0',
            totalReferralIncome: userInfo?.totalReferralIncome ?? '0',
            totalWithdrawn: userInfo?.totalWithdrawn ?? '0',
        };
    }, [userReportRaw, userInfo]);

    const userLevel = userReport?.displayLevel ?? userInfo?.level ?? 0;
    const userRank = userInfo?.rank ?? 0;
    const userRankName = useMemo(() => getRankName(userRank), [userRank]);

    const levelIndex = userLevel > 0 ? BigInt(userLevel - 1) : 0n;
    const { data: levelRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'levels',
        args: [levelIndex],
    });

    const userRewardPercent = levelRaw ? Number(extractString((levelRaw as unknown[])[0]) ?? '0') : 0;

    const rankIndex = userRank > 0 ? BigInt(userRank - 1) : 0n;
    const { data: rankRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'ranks',
        args: [rankIndex],
    });

    const rankInfo = rankRaw
        ? {
            name: userRankName,
            incomeReqFromTop3Usd: extractString((rankRaw as unknown[])[0]) ?? '0',
            directReq: extractString((rankRaw as unknown[])[1]) ?? '0',
            companySharePercent: Number(extractString((rankRaw as unknown[])[2]) ?? '0'),
        }
        : null;

    const tokenPriceUsd = (() => {
        const fromOracle = tokenPricePerTokenRaw ? tokenPricePerTokenRaw.toString() : '0';
        if (fromOracle !== '0') return fromOracle;
        return manualTokenPriceRaw ? manualTokenPriceRaw.toString() : '0';
    })();

    const pendingRewards = userReport?.pendingRoi ?? '0';
    const pendingRewardsHuman = formatUnits(pendingRewards, 18);

    const pendingComputed = useMemo(() => {
        try {
            const selfStakedStr = userInfo?.selfStaked ?? '0';
            const lastAccruedAtStr = userInfo?.lastAccruedAt ?? '0';
            const selfStakedBn = BigInt(selfStakedStr);
            const lastAccruedAtBn = BigInt(lastAccruedAtStr);
            if (selfStakedBn === 0n || lastAccruedAtBn === 0n) return '0';
            const nowBn = BigInt(Math.floor(Date.now() / 1000));
            const elapsed = nowBn > lastAccruedAtBn ? nowBn - lastAccruedAtBn : 0n;
            const rate = dailyRateRaw ? BigInt(dailyRateRaw.toString()) : 8_000_000_000_000_000n;
            const reward = (selfStakedBn * rate * elapsed) / (10n ** 18n) / 86_400n;
            return reward.toString();
        } catch {
            return '0';
        }
    }, [dailyRateRaw, userInfo?.lastAccruedAt, userInfo?.selfStaked]);

    const pendingComputedHuman = formatUnits(pendingComputed, 18);

    const tokenBalance = tokenBalanceRaw ? tokenBalanceRaw.toString() : '0';
    const tokenAllowance = tokenAllowanceRaw ? tokenAllowanceRaw.toString() : '0';
    const manualTokenPrice = manualTokenPriceRaw ? manualTokenPriceRaw.toString() : '0';

    const refetchPendingRewards = useCallback(async () => {
        try {
            return await refetchUserReport?.();
        } catch (error) {
            console.error('refetchPendingRewards failed', error);
            return null;
        }
    }, [refetchUserReport]);

    async function ensureAllowance(amountWei: bigint) {
        let allowanceStr = tokenAllowance;
        try {
            const fresh = await refetchTokenAllowance();
            const s = extractString((fresh as { data?: unknown })?.data ?? fresh);
            if (s) allowanceStr = s;
        } catch {
            // ignore
        }
        if (BigInt(allowanceStr) >= amountWei) return;

        const approveToast = toast.loading('Approving token spend...');
        try {
            await writeAndWaitForReceipt({
                abi: ERC20_ABI as Abi,
                address: TOKEN_ADDRESS,
                functionName: 'approve',
                args: [CONTRACT_ADDRESS, APPROVE_AMOUNT],
            });
            toast.success('Approval confirmed', { id: approveToast });
            await Promise.allSettled([refetchTokenAllowance(), refetchTokenBalance()]);
        } catch (err) {
            toast.error('Approval failed or cancelled', { id: approveToast });
            throw err;
        }
    }

    async function stakeToken(amount: string, referrer?: string) {
        const txToast = toast.loading('Submitting stake transaction...');
        try {
            const amountWei = parseEther(amount);
            await ensureAllowance(amountWei);
            const preferredReferrer = resolveReferrerAddress([referrer, userInfo?.referrer], address);
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'stake',
                args: [amountWei, preferredReferrer],
            });
            toast.success('Stake transaction confirmed', { id: txToast });
            await Promise.allSettled([refetchTokenAllowance(), refetchTokenBalance(), refetchUserInfo(), refetchPendingRewards()]);
            return receipt;
        } catch (err) {
            console.error('stake error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    async function stakeUsd(usdAmount: string, referrer?: string) {
        const usdFloat = parseFloat(usdAmount || '0');
        if (!usdFloat || usdFloat <= 0) throw new Error('Invalid USD amount');
        const usd18 = BigInt(Math.round(usdFloat * 1e18));

        let price18 = 0n;
        try {
            const fromOracle = BigInt(tokenPriceUsd || '0');
            if (fromOracle > 0n) price18 = fromOracle;
        } catch {
            // ignore
        }
        if (price18 === 0n) throw new Error('Token price unavailable');

        const tokenAmountWei = (usd18 * ONE_TOKEN) / price18;
        const tokenAmountStr = formatUnits(tokenAmountWei, 18);
        await stakeToken(tokenAmountStr, referrer);
    }

    async function unstake(amount: string) {
        const txToast = toast.loading('Unstaking in progress...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'unstake',
                args: [parseEther(amount)],
            });
            toast.success('Unstake confirmed', { id: txToast });
            await Promise.allSettled([refetchTokenBalance(), refetchUserInfo(), refetchPendingRewards()]);
            return receipt;
        } catch (err) {
            console.error('unstake error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    async function claimRoi() {
        const txToast = toast.loading('Claiming ROI rewards...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'claimRoi',
                args: [],
            });
            toast.success('ROI claimed successfully', { id: txToast });
            await Promise.allSettled([
                refetchTokenBalance(),
                refetchUserInfo(),
                refetchPendingRewards(),
                refetchTotalStaked(),
            ]);
            return receipt;
        } catch (err) {
            console.error('claimRoi error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    const fetchBondPlans = useCallback(async () => {
        const plans: Array<{ id: number; duration: number; rewardPercent: number; exists: boolean }> = [];
        for (let id = 1; id <= 10; id++) {
            try {
                const plan = await readContractSafe<unknown[]>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'bondPlans',
                    args: [BigInt(id)],
                    chainId: supportedChainId,
                });
                const exists = Boolean((plan as unknown[])[2]);
                if (exists) {
                    plans.push({
                        id,
                        duration: Number(extractString((plan as unknown[])[0]) ?? '0'),
                        rewardPercent: Number(extractString((plan as unknown[])[1]) ?? '0'),
                        exists,
                    });
                }
            } catch {
                break;
            }
        }
        return plans;
    }, [supportedChainId]);

    const fetchUserBonds = useCallback(async () => {
        if (!address) return [] as Array<{
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
            status: 'Active' | 'Matured' | 'Withdrawn';
        }>;

        const count = userReport?.bondCount ?? 0;
        const bonds: Array<{
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
            status: 'Active' | 'Matured' | 'Withdrawn';
        }> = [];

        for (let i = 0; i < count; i++) {
            try {
                const bond = await readContractSafe<unknown[]>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'userBonds',
                    args: [address as `0x${string}`, BigInt(i)],
                    chainId: supportedChainId,
                });
                const [planIdRaw, principalRaw, rewardRaw, startAtRaw, withdrawnRaw] = bond as unknown[];
                const planId = Number(extractString(planIdRaw) ?? '0');
                const principal = extractString(principalRaw) ?? '0';
                const reward = extractString(rewardRaw) ?? '0';
                const total = (BigInt(principal) + BigInt(reward)).toString();
                const startAt = Number(extractString(startAtRaw) ?? '0');
                const withdrawn = Boolean(withdrawnRaw);

                const plan = await readContractSafe<unknown[]>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'bondPlans',
                    args: [BigInt(planId)],
                    chainId: supportedChainId,
                });
                const duration = Number(extractString((plan as unknown[])[0]) ?? '0');
                const rewardPercent = Number(extractString((plan as unknown[])[1]) ?? '0');
                const endAt = startAt + duration;
                const now = Math.floor(Date.now() / 1000);
                let status: 'Active' | 'Matured' | 'Withdrawn' = 'Active';
                if (withdrawn) status = 'Withdrawn';
                else if (now >= endAt) status = 'Matured';

                bonds.push({
                    index: i,
                    planId,
                    principal,
                    reward,
                    total,
                    totalHuman: formatUnits(total, 18),
                    startAt,
                    endAt,
                    withdrawn,
                    rewardPercent,
                    status,
                });
            } catch (error) {
                console.error('fetchUserBonds error', error);
            }
        }

        return bonds;
    }, [address, supportedChainId, userReport?.bondCount]);

    async function buyBond(planId: number, amount: string, referrerOverride?: string) {
        const txToast = toast.loading('Submitting bond purchase...');
        try {
            const amountWei = parseEther(amount);
            await ensureAllowance(amountWei);
            const preferredReferrer = resolveReferrerAddress([referrerOverride, userInfo?.referrer], address);
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'buyBond',
                args: [BigInt(planId), amountWei, preferredReferrer],
            });
            toast.success('Bond purchase confirmed', { id: txToast });
            await Promise.allSettled([refetchUserInfo(), refetchPendingRewards(), refetchTokenBalance()]);
            return receipt;
        } catch (err) {
            console.error('buyBond error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    async function withdrawBond(index: number) {
        const txToast = toast.loading('Withdrawing bond...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'withdrawBond',
                args: [BigInt(index)],
            });
            toast.success('Bond withdrawn', { id: txToast });
            await Promise.allSettled([refetchUserInfo(), refetchPendingRewards(), refetchTokenBalance()]);
            return receipt;
        } catch (err) {
            console.error('withdrawBond error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    const fetchUserLevelIncome = useCallback(async () => {
        if (!address) return Array(15).fill('0');
        const results = await Promise.allSettled(
            Array.from({ length: 15 }, (_, i) =>
                readContractSafe<unknown>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'levelIncome',
                    args: [address as `0x${string}`, BigInt(i)],
                    chainId: supportedChainId,
                })
            )
        );
        return results.map((res) => (res.status === 'fulfilled' ? extractString(res.value) ?? '0' : '0'));
    }, [address, supportedChainId]);

    const fetchDirectsForAddress = useCallback(async (wallet: string, overrideCount?: number) => {
        const normalized = wallet as `0x${string}`;
        let directCount = overrideCount;
        if (directCount == null) {
            try {
                const info = await readContractSafe<unknown[]>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'users',
                    args: [normalized],
                    chainId: supportedChainId,
                });
                directCount = Number(extractString((info as unknown[])[7]) ?? '0');
            } catch {
                directCount = 0;
            }
        }
        if (!directCount || directCount <= 0) return [] as string[];
        const indices = Array.from({ length: directCount }, (_, i) => BigInt(i));
        const reads = await Promise.allSettled(
            indices.map((idx) =>
                readContractSafe<string>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'directsList',
                    args: [normalized, idx],
                    chainId: supportedChainId,
                })
            )
        );
        return reads
            .filter((res): res is PromiseFulfilledResult<string> => res.status === 'fulfilled' && typeof res.value === 'string')
            .map((res) => res.value);
    }, [supportedChainId]);

    const fetchTeamSize = useCallback(async () => {
        if (!address) {
            setTeamSize(0);
            return 0;
        }
        try {
            const result = await readContractSafe<unknown>({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'getTeamSize',
                args: [address as `0x${string}`],
                chainId: supportedChainId,
            });
            const size = Number(extractString(result) ?? '0');
            setTeamSize(Number.isNaN(size) ? 0 : size);
            return size;
        } catch (err) {
            console.error('fetchTeamSize error', err);
            setTeamSize(0);
            return 0;
        }
    }, [address, supportedChainId]);

    useEffect(() => {
        if (!address) {
            setDirectsList([]);
            setDirectsWithBalances([]);
            return;
        }

        let cancelled = false;

        async function loadDirects() {
            const directCount = userInfo?.directs ?? 0;
            if (!directCount) {
                if (!cancelled) {
                    setDirectsList([]);
                    setDirectsWithBalances([]);
                }
                return;
            }

            setLoadingDirects(true);
            try {
                const addrs = await fetchDirectsForAddress(address as `0x${string}`, directCount);
                if (cancelled) return;
                setDirectsList(addrs);
                if (addrs.length === 0) {
                    setDirectsWithBalances([]);
                    return;
                }
                let incomeByDirect: Record<string, string> = {};
                try {
                    const result = await readContractSafe<unknown>({
                        address: CONTRACT_ADDRESS,
                        abi: CONTRACT_ABI,
                        functionName: 'getDirectsWithRewards',
                        args: [address as `0x${string}`],
                        chainId: supportedChainId,
                    });
                    if (Array.isArray(result)) {
                        const [rewardAddrsRaw, rewardsRaw] = result as [unknown, unknown];
                        const rewardAddrs = Array.isArray(rewardAddrsRaw) ? rewardAddrsRaw : [];
                        const rewards = Array.isArray(rewardsRaw) ? rewardsRaw : [];
                        incomeByDirect = rewardAddrs.reduce<Record<string, string>>((acc, rawAddr, idx) => {
                            const addrStr = extractString(rawAddr);
                            if (!addrStr) return acc;
                            const reward = rewards[idx];
                            const rewardStr = extractString(reward) ?? '0';
                            acc[addrStr.toLowerCase()] = rewardStr;
                            return acc;
                        }, {});
                    }
                } catch (incomeErr) {
                    console.warn('getDirectsWithRewards failed', incomeErr);
                }

                const detailResults = await Promise.allSettled(
                    addrs.map(async (addr) => {
                        const [info, report] = await Promise.all([
                            readContractSafe<unknown[]>({
                                address: CONTRACT_ADDRESS,
                                abi: CONTRACT_ABI,
                                functionName: 'users',
                                args: [addr as `0x${string}`],
                                chainId: supportedChainId,
                            }),
                            readContractSafe<unknown[]>({
                                address: CONTRACT_ADDRESS,
                                abi: CONTRACT_ABI,
                                functionName: 'getUserReport',
                                args: [addr as `0x${string}`],
                                chainId: supportedChainId,
                            }),
                        ]);
                        const infoArr = info as unknown[];
                        const reportArr = report as unknown[];
                        const selfStaked = extractString(infoArr[2]) ?? '0';
                        const pendingRoi = extractString(reportArr?.[0]) ?? '0';
                        const stakeWithAccrued = extractString(reportArr?.[1]) ?? selfStaked;
                        const levelValRaw = extractString(infoArr[7]) ?? '0';
                        let level = 0;
                        try {
                            const lvl = BigInt(levelValRaw);
                            if (lvl !== 255n) level = Number(lvl);
                        } catch {
                            level = 0;
                        }
                        const detail: DirectDetail = {
                            address: addr,
                            selfStaked,
                            stakeWithAccrued,
                            pendingRoi,
                            level,
                            referralIncome: incomeByDirect[addr.toLowerCase()] ?? '0',
                        };
                        return detail;
                    })
                );
                if (cancelled) return;
                const details = addrs.map((addr, idx) => {
                    const result = detailResults[idx];
                    if (result && result.status === 'fulfilled') {
                        return result.value;
                    }
                    console.warn('Failed to load direct detail for', addr);
                    return {
                        address: addr,
                        selfStaked: '0',
                        stakeWithAccrued: '0',
                        pendingRoi: '0',
                        level: 0,
                        referralIncome: incomeByDirect[addr.toLowerCase()] ?? '0',
                    } satisfies DirectDetail;
                });
                setDirectsWithBalances(details);
            } catch (error) {
                console.error('loadDirects error', error);
                if (!cancelled) {
                    setDirectsList([]);
                    setDirectsWithBalances([]);
                }
            } finally {
                if (!cancelled) setLoadingDirects(false);
            }
        }

        void loadDirects();
        void fetchTeamSize();

        return () => {
            cancelled = true;
        };
    }, [address, fetchDirectsForAddress, fetchTeamSize, supportedChainId, userInfo?.directs]);

    const fetchDownlinesByLevel = useCallback(
        async (maxDepth?: number): Promise<Record<number, string[]>> => {
            if (!address) return {};
            const unlocked = userLevel > 0 ? userLevel : 1;
            const depth = Math.max(1, Math.min(maxDepth ?? unlocked, 15));
            const levels: Record<number, string[]> = {};
            const levelOne = await fetchDirectsForAddress(address as `0x${string}`, userInfo?.directs);
            levels[1] = levelOne;
            let frontier = levelOne;
            for (let current = 2; current <= depth; current++) {
                if (!frontier.length) break;
                const nextLevelArrays = await Promise.all(
                    frontier.map((addr) => fetchDirectsForAddress(addr as `0x${string}`))
                );
                const next = nextLevelArrays.flat();
                levels[current] = next;
                frontier = next;
            }
            return levels;
        },
        [address, fetchDirectsForAddress, userInfo?.directs, userLevel]
    );

    const EVT = useMemo(() => ({
        Staked: parseAbiItem('event Staked(address indexed user, uint256 amount, address indexed referrer, uint256 usdLocked)'),
        Unstaked: parseAbiItem('event Unstaked(address indexed user, uint256 amount, uint256 usdReduced)'),
        RoiCompounded: parseAbiItem('event RoiCompounded(address indexed user, uint256 amount)'),
        RoiClaimed: parseAbiItem('event RoiClaimed(address indexed user, uint256 grossAmount, uint256 userAmount, uint256 totalCommission)'),
        ReferralCreditedFromPool: parseAbiItem('event ReferralCreditedFromPool(address indexed from, address indexed to, uint256 amount, uint8 levelIndex)'),
        BondPurchased: parseAbiItem('event BondPurchased(address indexed user, uint8 planId, uint256 principal, uint256 reward)'),
        BondWithdrawn: parseAbiItem('event BondWithdrawn(address indexed user, uint8 planId, uint256 principal)'),
        LevelUpdated: parseAbiItem('event LevelUpdated(address indexed user, uint8 oldLevel, uint8 newLevel)'),
        RankUpdated: parseAbiItem('event RankUpdated(address indexed user, uint8 oldRank, uint8 newRank)'),
    }), []);

    const ERC20_EVT = useMemo(() => ({
        Transfer: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        Approval: parseAbiItem('event Approval(address indexed owner, address indexed spender, uint256 value)'),
    }), []);

    const fetchUserActivity = useCallback(
        async (options?: {
            fromBlock?: bigint;
            toBlock?: bigint;
            maxBlocksBack?: number;
            includeToken?: boolean;
            includeApprovals?: boolean;
        }): Promise<ActivityItem[]> => {
            if (!address || !publicClient) return [];

            const latest = await publicClient.getBlockNumber();
            const maxBack = BigInt(options?.maxBlocksBack ?? 200_000);
            const fromBlock = options?.fromBlock ?? (latest > maxBack ? latest - maxBack : 0n);
            const toBlock = options?.toBlock ?? latest;

            const acct = address as `0x${string}`;
            const stakingAddr = CONTRACT_ADDRESS as `0x${string}`;
            const tokenAddr = TOKEN_ADDRESS as `0x${string}`;

            const [staked, unstaked, compounded, claimed, refIn, refOut, bondBuy, bondWd, lvlUpd, rnkUpd] = await Promise.all([
                publicClient.getLogs({ address: stakingAddr, event: EVT.Staked, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.Unstaked, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.RoiCompounded, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.RoiClaimed, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.ReferralCreditedFromPool, args: { to: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.ReferralCreditedFromPool, args: { from: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.BondPurchased, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.BondWithdrawn, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.LevelUpdated, args: { user: acct }, fromBlock, toBlock }),
                publicClient.getLogs({ address: stakingAddr, event: EVT.RankUpdated, args: { user: acct }, fromBlock, toBlock }),
            ]);

            const blockNumbers = new Set<number>();
            const recordBlockNumbers = (logs: readonly unknown[]) => {
                logs.forEach((log) => {
                    const value = (log as { blockNumber?: bigint | number | null }).blockNumber;
                    if (value != null) blockNumbers.add(Number(value));
                });
            };

            recordBlockNumbers(staked);
            recordBlockNumbers(unstaked);
            recordBlockNumbers(compounded);
            recordBlockNumbers(claimed);
            recordBlockNumbers(refIn);
            recordBlockNumbers(refOut);
            recordBlockNumbers(bondBuy);
            recordBlockNumbers(bondWd);
            recordBlockNumbers(lvlUpd);
            recordBlockNumbers(rnkUpd);

            let transfersInLogs: unknown[] = [];
            let transfersOutLogs: unknown[] = [];
            let approvalLogs: unknown[] = [];

            if (options?.includeToken !== false) {
                const [transfersIn, transfersOut] = await Promise.all([
                    publicClient.getLogs({ address: tokenAddr, event: ERC20_EVT.Transfer, args: { to: acct }, fromBlock, toBlock }),
                    publicClient.getLogs({ address: tokenAddr, event: ERC20_EVT.Transfer, args: { from: acct }, fromBlock, toBlock }),
                ]);
                transfersInLogs = transfersIn as unknown[];
                transfersOutLogs = transfersOut as unknown[];
                recordBlockNumbers(transfersInLogs);
                recordBlockNumbers(transfersOutLogs);

                if (options?.includeApprovals) {
                    const approvals = await publicClient.getLogs({ address: tokenAddr, event: ERC20_EVT.Approval, args: { owner: acct }, fromBlock, toBlock });
                    approvalLogs = approvals as unknown[];
                    recordBlockNumbers(approvalLogs);
                }
            }

            const blockTimestampMap = new Map<number, number>();
            await Promise.allSettled(
                Array.from(blockNumbers).map(async (bn) => {
                    try {
                        const block = await publicClient.getBlock({ blockNumber: BigInt(bn) });
                        blockTimestampMap.set(bn, Number(block.timestamp));
                    } catch {
                        blockTimestampMap.set(bn, 0);
                    }
                })
            );

            const items: ActivityItem[] = [];

            staked.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'STAKE',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.amount),
                    counterparty: toStr(args.referrer),
                });
            });

            unstaked.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'UNSTAKE',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.amount),
                });
            });

            compounded.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'COMPOUND',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.amount),
                });
            });

            claimed.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'CLAIM',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.userAmount ?? args.grossAmount),
                    meta: {
                        grossAmount: toStr(args.grossAmount),
                        userAmount: toStr(args.userAmount),
                        totalCommission: toStr(args.totalCommission),
                    },
                });
            });

            refIn.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'REFERRAL_IN',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.amount),
                    counterparty: toStr(args.from),
                    meta: { levelIndex: toNum(args.levelIndex) },
                });
            });

            refOut.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'REFERRAL_OUT',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.amount),
                    counterparty: toStr(args.to),
                    meta: { levelIndex: toNum(args.levelIndex) },
                });
            });

            bondBuy.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                const principal = toStr(args.principal) ?? '0';
                const reward = toStr(args.reward) ?? '0';
                const total = (BigInt(principal) + BigInt(reward)).toString();
                items.push({
                    kind: 'BOND_BUY',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: total,
                    meta: { planId: toNum(args.planId), principal, reward },
                });
            });

            bondWd.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'BOND_WITHDRAW',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    amount: toStr(args.principal),
                    meta: { planId: toNum(args.planId) },
                });
            });

            lvlUpd.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'LEVEL',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    meta: { oldLevel: toNum(args.oldLevel), newLevel: toNum(args.newLevel) },
                });
            });

            rnkUpd.forEach((log) => {
                const args = (log as { args?: Record<string, unknown> }).args ?? {};
                const blockNum = Number(log.blockNumber ?? 0n);
                items.push({
                    kind: 'RANK',
                    txHash: log.transactionHash,
                    blockNumber: blockNum,
                    timestamp: blockTimestampMap.get(blockNum),
                    meta: { oldRank: toNum(args.oldRank), newRank: toNum(args.newRank) },
                });
            });

            if (options?.includeToken !== false) {
                transfersInLogs.forEach((rawLog) => {
                    const log = rawLog as { blockNumber?: bigint | number | null; transactionHash: string; args?: Record<string, unknown> };
                    const args = log.args ?? {};
                    const blockNum = Number((log.blockNumber ?? 0n));
                    items.push({
                        kind: 'TOKEN_TRANSFER_IN',
                        txHash: log.transactionHash,
                        blockNumber: blockNum,
                        timestamp: blockTimestampMap.get(blockNum),
                        amount: toStr(args.value),
                        counterparty: toStr(args.from),
                    });
                });

                transfersOutLogs.forEach((rawLog) => {
                    const log = rawLog as { blockNumber?: bigint | number | null; transactionHash: string; args?: Record<string, unknown> };
                    const args = log.args ?? {};
                    const blockNum = Number((log.blockNumber ?? 0n));
                    items.push({
                        kind: 'TOKEN_TRANSFER_OUT',
                        txHash: log.transactionHash,
                        blockNumber: blockNum,
                        timestamp: blockTimestampMap.get(blockNum),
                        amount: toStr(args.value),
                        counterparty: toStr(args.to),
                    });
                });

                if (options?.includeApprovals) {
                    approvalLogs.forEach((rawLog) => {
                        const log = rawLog as { blockNumber?: bigint | number | null; transactionHash: string; args?: Record<string, unknown> };
                        const args = log.args ?? {};
                        const blockNum = Number((log.blockNumber ?? 0n));
                        items.push({
                            kind: 'TOKEN_APPROVAL',
                            txHash: log.transactionHash,
                            blockNumber: blockNum,
                            timestamp: blockTimestampMap.get(blockNum),
                            amount: toStr(args.value),
                            counterparty: toStr(args.spender),
                        });
                    });
                }
            }

            items.sort((a, b) => (b.blockNumber - a.blockNumber) || a.txHash.localeCompare(b.txHash));
            return items;
        },
        [address, publicClient, EVT, ERC20_EVT]
    );

    const fetchHistoryByKind = useCallback(
        async (kind: Extract<ActivityKind, 'STAKE' | 'UNSTAKE'>) => {
            const mapEntries = (items: ActivityItem[]) =>
                items
                    .map((item) => ({
                        amount: item.amount ?? '0',
                        timestamp: Number.isFinite(item.timestamp ?? 0) ? Number(item.timestamp) : 0,
                    }))
                    .filter((entry) => entry.timestamp > 0 || entry.amount !== '0')
                    .sort((a, b) => b.timestamp - a.timestamp);

            let activity = await fetchUserActivity({ includeToken: false, includeApprovals: false });
            let filtered = activity.filter((item) => item.kind === kind);

            if (filtered.length === 0) {
                activity = await fetchUserActivity({ includeToken: false, includeApprovals: false, maxBlocksBack: 1_000_000 });
                filtered = activity.filter((item) => item.kind === kind);
            }

            return mapEntries(filtered);
        },
        [fetchUserActivity]
    );

    const fetchStakeHistory = useCallback(async () => {
        return fetchHistoryByKind('STAKE');
    }, [fetchHistoryByKind]);

    const fetchUnstakeHistory = useCallback(async () => {
        return fetchHistoryByKind('UNSTAKE');
    }, [fetchHistoryByKind]);

    const fetchRoiHistory = useCallback(async () => {
        if (!address) return [] as Array<{ amount: string; timestamp: number }>;
        try {
            const raw = await readContractSafe<unknown>({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'getStakeHistory',
                args: [address as `0x${string}`],
                chainId: supportedChainId,
            });
            if (!Array.isArray(raw)) return [];
            return raw
                .map((entry) => {
                    if (Array.isArray(entry)) {
                        const amount = extractString(entry[0]) ?? '0';
                        const ts = Number(extractString(entry[1]) ?? '0');
                        return { amount, timestamp: Number.isNaN(ts) ? 0 : ts };
                    }
                    if (entry && typeof entry === 'object') {
                        const amount = extractString((entry as { amount?: unknown }).amount) ?? '0';
                        const ts = Number(extractString((entry as { timestamp?: unknown }).timestamp) ?? '0');
                        return { amount, timestamp: Number.isNaN(ts) ? 0 : ts };
                    }
                    return { amount: '0', timestamp: 0 };
                })
                .filter((item) => item.timestamp > 0 || item.amount !== '0')
                .sort((a, b) => b.timestamp - a.timestamp);
        } catch (err) {
            console.error('fetchRoiHistory error', err);
            return [];
        }
    }, [address, supportedChainId]);

    const fetchROIHistoryFull = useCallback(async () => {
        return fetchRoiHistory();
    }, [fetchRoiHistory]);

    const fetchLastNROIEvents = useCallback(
        async (max: number) => {
            const history = await fetchRoiHistory();
            if (history.length === 0) return [];
            const limit = Math.max(1, max);
            return history.slice(0, limit);
        },
        [fetchRoiHistory]
    );

    return {
        totalStaked: totalStakedRaw,
        tokenBalance,
        tokenAllowance,
        manualTokenPrice,
        tokenPriceUsd,
        userInfo,
        userReport,
        userLevel,
        userRewardPercent,
        userRank,
        userRankName,
        levelInfo: levelRaw
            ? {
                rewardPercent: Number(extractString((levelRaw as unknown[])[0]) ?? '0'),
                selfStakeUsdReq: extractString((levelRaw as unknown[])[1]) ?? '0',
                directsReq: extractString((levelRaw as unknown[])[2]) ?? '0',
            }
            : null,
        rankInfo,
        pendingRewards,
        pendingRewardsHuman,
        pendingComputed,
        pendingComputedHuman,
        stake: stakeToken,
        stakeUsd,
        unstake,
        claimRoi,
        fetchBondPlans,
        fetchUserBonds,
        buyBond,
        withdrawBond,
        fetchUserLevelIncome,
        fetchUserActivity,
        fetchDownlinesByLevel,
        fetchStakeHistory,
        fetchUnstakeHistory,
        fetchROIHistoryFull,
        fetchLastNROIEvents,
        directsList,
        directsWithBalances,
        loadingDirects,
        teamSize,
        fetchTeamSize,
        refetchTotalStaked,
        refetchUserInfo,
        refetchPendingRewards,
        refetchTokenBalance,
        refetchTokenAllowance,
        refetchTokenPrice,
    };
}
