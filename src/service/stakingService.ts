import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import type { Abi } from 'abitype';
import { toast } from 'react-hot-toast';
import { parseAbiItem, parseEther } from 'viem';
import { readContract, getPublicClient } from '@wagmi/core';

import { writeAndWaitForReceipt } from '@/lib/wagmiWrite';
import { CONTRACT_ADDRESSES, DEFAULT_REFERRER, RANK_NAMES, TEST_USER_ADDRESS } from '@/lib/constants';
import CONTRACT_ABI from '@/service/stakingABI.json';
import { config } from '@/lib/wagmiConfig';

const ERC20_ABI = [
    { constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], type: 'function' },
    { constant: true, inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }], name: 'allowance', outputs: [{ name: 'remaining', type: 'uint256' }], type: 'function' },
    { constant: false, inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: 'success', type: 'bool' }], type: 'function' },
];

const UNISWAP_V2_PAIR_ABI = [
    { inputs: [], name: 'token0', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'token1', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.stakingPlatform as `0x${string}`;
const TOKEN_ADDRESS = CONTRACT_ADDRESSES.token as `0x${string}`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const APPROVE_AMOUNT = 1_000_000n * 10n ** 18n;
const ONE_TOKEN = 10n ** 18n;

function parsePositiveBigInt(value: string | undefined, fallback: bigint) {
    if (!value) return fallback;
    try {
        const parsed = BigInt(value);
        return parsed > 0n ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function bigintToSafeNumber(value: bigint, fallback: number) {
    if (value <= 0n) return fallback;
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number.MAX_SAFE_INTEGER;
    }
    return Number(value);
}

function isPrunedHistoryError(error: unknown) {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('History has been pruned');
}

function isNetworkTransportError(error: unknown) {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    return /Failed to fetch|NetworkError|ERR_FAILED|fetch at|CORS policy/i.test(message);
}

const DEFAULT_LOG_LOOKBACK = parsePositiveBigInt(import.meta.env.VITE_MAX_LOG_LOOKBACK, 500_000n);
const PRUNED_RETRY_WINDOW = parsePositiveBigInt(import.meta.env.VITE_PRUNED_RETRY_WINDOW, DEFAULT_LOG_LOOKBACK);
const MIN_LOG_SPLIT_THRESHOLD = 1_000n;

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

export type DirectDetail = {
    address: string;
    selfStaked: string;
    stakeWithAccrued: string;
    pendingRoi: string;
    level: number;
    referralIncome: string;
    totalReferralIncome?: string;
    rank?: number;
    referrer: string;
    referrerShort: string;
    lastAccruedAt: string;
    directs: number;
};

type HistoryEntry = {
    amount: string;
    timestamp: number;
    txHash?: string;
    blockNumber?: number;
};

function buildEmptyDirectDetail(address: string): DirectDetail {
    return {
        address,
        selfStaked: '0',
        stakeWithAccrued: '0',
        pendingRoi: '0',
        level: 0,
        referralIncome: '0',
        totalReferralIncome: '0',
        referrer: ZERO_ADDRESS,
        referrerShort: shortenAddress(ZERO_ADDRESS),
        lastAccruedAt: '0',
        directs: 0,
    } satisfies DirectDetail;
}

type HistoryPage = {
    items: HistoryEntry[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

type LevelIncomeEvent = {
    txHash: string;
    blockNumber: number;
    timestamp: number;
    amount: string;
    from?: string;
    levelIndex: number;
};

function mapChainId(input: number | undefined): 1 | 10 | 56 | 97 | 137 | 42161 | 8453 {
    switch (input) {
        case 1:
        case 10:
        case 56:
        case 97:
        case 137:
        case 42161:
        case 8453:
            return input;
        default:
            return 56;
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
    console.log("chain id ----->", chainId);

    const viewingAddress = useMemo(() => {
        const connected = address as `0x${string}` | undefined;
        return connected ?? (TEST_USER_ADDRESS as `0x${string}`);
    }, [address]);

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
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'totalStaked',
    });

    const { data: userInfoRaw, refetch: refetchUserInfo } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'users',
        args: [viewingAddress],
        query: { enabled: Boolean(viewingAddress) },
    });

    const { data: twapPriceRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'twapPrice18',
    });

    const { data: pricePairRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'pricePair',
    });

    const pricePairAddress = useMemo(() => {
        const value = (pricePairRaw ?? ZERO_ADDRESS) as string;
        if (!value || value.toLowerCase() === ZERO_ADDRESS.toLowerCase()) return undefined;
        if (!value.startsWith('0x') || value.length !== 42) return undefined;
        return value as `0x${string}`;
    }, [pricePairRaw]);

    const { data: pairToken0Raw } = useReadContract({
        address: pricePairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'token0',
        query: { enabled: Boolean(pricePairAddress) },
    });

    const { data: pairToken1Raw } = useReadContract({
        address: pricePairAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        functionName: 'token1',
        query: { enabled: Boolean(pricePairAddress) },
    });

    const { data: dailyRateRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'DAILY_RATE',
    });

    const { data: tokenBalanceRaw, refetch: refetchTokenBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [viewingAddress],
        query: { enabled: Boolean(viewingAddress) },
    });

    const { data: tokenAllowanceRaw, refetch: refetchTokenAllowance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [viewingAddress, CONTRACT_ADDRESS],
        query: { enabled: Boolean(viewingAddress) },
    });

    const { data: pendingRewardRaw, refetch: refetchPendingReward } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'pendingReward',
        args: [viewingAddress],
        query: { enabled: Boolean(viewingAddress) },
    });

    const userInfo = useMemo(() => {
        if (!userInfoRaw) return null;
        const arr = userInfoRaw as unknown[];
        const selfStaked = extractString(arr[0]) ?? '0';
        const activeBondPrincipal = extractString(arr[1]) ?? '0';
        const lastAccruedAt = extractString(arr[2]) ?? '0';
        const referrer = (arr[3] as string) ?? ZERO_ADDRESS;
        const directsValue = Number(extractString(arr[4]) ?? '0');
        const levelRaw = extractString(arr[5]) ?? '0';
        let level = 0;
        try {
            const lvl = BigInt(levelRaw);
            if (lvl !== 255n) level = Number(lvl);
        } catch {
            level = 0;
        }
        const rankValue = Number(extractString(arr[6]) ?? '0');
        const totalEarned = extractString(arr[7]) ?? '0';
        const totalWithdrawn = extractString(arr[8]) ?? '0';
        const totalReferralIncome = extractString(arr[9]) ?? '0';

        return {
            selfStaked,
            activeBondValue: activeBondPrincipal,
            lastAccruedAt,
            referrer,
            referrerShort: shortenAddress(referrer),
            directs: Number.isNaN(directsValue) ? 0 : directsValue,
            level,
            rank: rankValue,
            rankName: getRankName(rankValue),
            totalRoiEarned: totalEarned,
            totalLevelRewardEarned: '0',
            totalReferralIncome,
            totalWithdrawn,
        };
    }, [userInfoRaw]);

    const userReport = useMemo(() => {
        if (!userInfo && pendingRewardRaw == null) return null;
        const pendingRoi = extractString(pendingRewardRaw) ?? '0';
        let stakeWithAccrued = userInfo?.selfStaked ?? '0';
        try {
            const base = BigInt(userInfo?.selfStaked ?? '0');
            const bond = BigInt(userInfo?.activeBondValue ?? '0');
            const pending = BigInt(pendingRoi);
            stakeWithAccrued = (base + bond + pending).toString();
        } catch {
            // silently fall back to self stake amount
        }

        return {
            pendingRoi,
            stakeWithAccrued,
            usdStakedLive: '0',
            displayLevel: userInfo?.level ?? 0,
            bondCount: 0,
            roiHistoryCount: 0,
            totalRoiEarned: userInfo?.totalRoiEarned ?? '0',
            totalLevelRewardEarned: userInfo?.totalLevelRewardEarned ?? '0',
            totalReferralIncome: userInfo?.totalReferralIncome ?? '0',
            totalWithdrawn: userInfo?.totalWithdrawn ?? '0',
        };
    }, [pendingRewardRaw, userInfo]);

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

    const tokenPriceUsd = useMemo(() => {
        if (twapPriceRaw == null) return '0';
        try {
            const price = BigInt(twapPriceRaw as bigint);
            if (price <= 0n) return '0';

            const stakingLower = TOKEN_ADDRESS.toLowerCase();
            const token0 = typeof pairToken0Raw === 'string' ? pairToken0Raw.toLowerCase() : undefined;
            const token1 = typeof pairToken1Raw === 'string' ? pairToken1Raw.toLowerCase() : undefined;

            if (token0 === stakingLower) {
                return price.toString();
            }

            if (token1 === stakingLower) {
                if (price === 0n) return '0';
                const inverted = (ONE_TOKEN * ONE_TOKEN) / price;
                return inverted.toString();
            }

            return price.toString();
        } catch (error) {
            console.error('tokenPriceUsd compute failed', error);
            return '0';
        }
    }, [pairToken0Raw, pairToken1Raw, twapPriceRaw]);

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
    const manualTokenPrice = tokenPriceUsd;

    const refetchPendingRewards = useCallback(async () => {
        try {
            return await refetchPendingReward?.();
        } catch (error) {
            console.error('refetchPendingRewards failed', error);
            return null;
        }
    }, [refetchPendingReward]);

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
        toast.error('Direct ROI claim is no longer supported; rewards auto-compound.');
        throw new Error('ROI claim not supported by current contract');
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
        const targetAddress = viewingAddress;
        if (!targetAddress) return [] as Array<{
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
                    args: [targetAddress, BigInt(i)],
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
    }, [supportedChainId, userReport?.bondCount, viewingAddress]);

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

    async function blockUserAddress(target: `0x${string}`) {
        const txToast = toast.loading('Blocking user...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'blockUser',
                args: [target],
            });
            toast.success('User blocked successfully', { id: txToast });
            return receipt;
        } catch (err) {
            console.error('blockUser error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    async function unblockUserAddress(target: `0x${string}`) {
        const txToast = toast.loading('Unblocking user...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'unblockUser',
                args: [target],
            });
            toast.success('User unblocked successfully', { id: txToast });
            return receipt;
        } catch (err) {
            console.error('unblockUser error', err);
            toast.error(getErrorMessage(err), { id: txToast });
            throw err;
        }
    }

    const fetchUserLevelIncome = useCallback(async () => {
        const targetAddress = viewingAddress;
        if (!targetAddress) return Array(15).fill('0');
        const results = await Promise.allSettled(
            Array.from({ length: 15 }, (_, i) =>
                readContractSafe<unknown>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'levelIncome',
                    args: [targetAddress, BigInt(i)],
                    chainId: supportedChainId,
                })
            )
        );
        return results.map((res) => (res.status === 'fulfilled' ? extractString(res.value) ?? '0' : '0'));
    }, [supportedChainId, viewingAddress]);

    const getMemberDetail = useCallback(async (addr: `0x${string}`): Promise<DirectDetail> => {
        try {
            const [infoRaw, pendingRaw] = await Promise.all([
                readContractSafe<unknown[]>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'users',
                    args: [addr],
                    chainId: supportedChainId,
                }),
                readContractSafe<unknown>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'pendingReward',
                    args: [addr],
                    chainId: supportedChainId,
                }),
            ]);

            const infoArr = Array.isArray(infoRaw) ? infoRaw : [];
            const selfStaked = extractString(infoArr[0]) ?? '0';
            const activeBond = extractString(infoArr[1]) ?? '0';
            const pendingRoi = extractString(pendingRaw) ?? '0';
            let stakeWithAccrued = selfStaked;
            try {
                stakeWithAccrued = (BigInt(selfStaked) + BigInt(activeBond ?? '0') + BigInt(pendingRoi)).toString();
            } catch {
                // ignore conversion errors
            }

            const levelRaw = extractString(infoArr[5]) ?? '0';
            let level = 0;
            try {
                const lvl = BigInt(levelRaw);
                if (lvl !== 255n) level = Number(lvl);
            } catch {
                level = 0;
            }
            const rankRaw = extractString(infoArr[6]) ?? '0';
            const rank = Number(rankRaw);
            const totalReferralIncome = extractString(infoArr[9]) ?? '0';
            const lastAccruedAt = extractString(infoArr[2]) ?? '0';
            const referrer = (infoArr[3] as string) ?? ZERO_ADDRESS;
            const directsParsed = Number(extractString(infoArr[4]) ?? '0');
            const directs = Number.isNaN(directsParsed) ? 0 : directsParsed;

            return {
                address: addr,
                selfStaked,
                stakeWithAccrued,
                pendingRoi,
                level,
                referralIncome: '0',
                totalReferralIncome,
                rank: Number.isNaN(rank) || rank <= 0 ? undefined : rank,
                referrer,
                referrerShort: shortenAddress(referrer),
                lastAccruedAt,
                directs,
            } satisfies DirectDetail;
        } catch (err) {
            console.warn('getMemberDetail failed', addr, err);
            return buildEmptyDirectDetail(addr);
        }
    }, [supportedChainId]);

    const fetchMemberDetails = useCallback(async (addresses: string[]) => {
        if (!addresses.length) return [] as DirectDetail[];
        const results = await Promise.allSettled(
            addresses.map((addr) => getMemberDetail(addr as `0x${string}`))
        );
        return addresses.map((addr, idx) => {
            const result = results[idx];
            if (result?.status === 'fulfilled') {
                return result.value;
            }
            console.warn('fetchMemberDetails fallback for', addr, result);
            return buildEmptyDirectDetail(addr);
        });
    }, [getMemberDetail]);

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
                directCount = Number(extractString((info as unknown[])[4]) ?? '0');
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
        const root = viewingAddress;
        if (!root) {
            setTeamSize(0);
            return 0;
        }

        const visited = new Set<string>([root.toLowerCase()]);
        let total = 0;
        let currentLevel = await fetchDirectsForAddress(root, userInfo?.directs);
        let depth = 0;
        const depthLimit = 10;

        while (currentLevel.length && depth < depthLimit) {
            depth += 1;
            const nextLevel: string[] = [];
            for (const addr of currentLevel) {
                const normalized = addr.toLowerCase();
                if (visited.has(normalized)) continue;
                visited.add(normalized);
                total += 1;
                try {
                    const directs = await fetchDirectsForAddress(addr as `0x${string}`);
                    nextLevel.push(...directs);
                } catch (err) {
                    console.warn('fetchTeamSize direct fetch failed', err);
                }
            }
            currentLevel = nextLevel;
        }

        setTeamSize(total);
        return total;
    }, [fetchDirectsForAddress, userInfo?.directs, viewingAddress]);

    const fetchTotalUsers = useCallback(async () => {
        try {
            const result = await readContractSafe<unknown>({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'totalUsers',
                chainId: supportedChainId,
            });
            const total = Number(extractString(result) ?? '0');
            return Number.isNaN(total) ? 0 : total;
        } catch (err) {
            console.error('fetchTotalUsers error', err);
            return 0;
        }
    }, [supportedChainId]);

    const fetchUsersBatch = useCallback(
        async (offset = 0, limit = 25): Promise<{ total: number; items: DirectDetail[] }> => {
            const safeOffset = Math.max(0, offset);
            const safeLimit = Math.max(0, limit);
            const total = await fetchTotalUsers();
            if (total === 0 || safeLimit === 0 || safeOffset >= total) {
                return { total, items: [] };
            }

            const end = Math.min(total, safeOffset + safeLimit);
            const indices = Array.from({ length: end - safeOffset }, (_, idx) => BigInt(safeOffset + idx));

            const responses = await Promise.allSettled(
                indices.map((idx) =>
                    readContractSafe<string>({
                        address: CONTRACT_ADDRESS,
                        abi: CONTRACT_ABI,
                        functionName: 'allUsers',
                        args: [idx],
                        chainId: supportedChainId,
                    })
                )
            );

            const addresses = responses.map((res) => (res.status === 'fulfilled' ? res.value : null));
            const validAddresses = addresses.filter((addr): addr is string => Boolean(addr && addr.startsWith('0x')));
            const detailsForValid = await fetchMemberDetails(validAddresses);
            const detailMap = new Map(detailsForValid.map((detail) => [detail.address.toLowerCase(), detail]));

            const items = addresses
                .map((addr) => {
                    if (!addr || typeof addr !== 'string' || !addr.startsWith('0x')) {
                        return null;
                    }
                    return detailMap.get(addr.toLowerCase()) ?? buildEmptyDirectDetail(addr);
                })
                .filter((entry): entry is DirectDetail => entry !== null);

            return { total, items };
        },
        [fetchMemberDetails, fetchTotalUsers, supportedChainId]
    );

    const fetchCompanyPoolStatus = useCallback(async () => {
        try {
            const [poolRaw, balanceRaw] = await Promise.all([
                readContractSafe<unknown>({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'companyValuationPool',
                    chainId: supportedChainId,
                }),
                readContractSafe<unknown>({
                    address: TOKEN_ADDRESS,
                    abi: ERC20_ABI,
                    functionName: 'balanceOf',
                    args: [CONTRACT_ADDRESS],
                    chainId: supportedChainId,
                }),
            ]);

            return {
                poolBalance: extractString(poolRaw) ?? '0',
                contractTokenBalance: extractString(balanceRaw) ?? '0',
            };
        } catch (err) {
            console.error('fetchCompanyPoolStatus error', err);
            return { poolBalance: '0', contractTokenBalance: '0' };
        }
    }, [supportedChainId]);

    useEffect(() => {
        const targetAddress = viewingAddress;
        if (!targetAddress) {
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
                const addrs = await fetchDirectsForAddress(targetAddress, directCount);
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
                        args: [targetAddress],
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

                const memberDetails = await fetchMemberDetails(addrs);
                if (cancelled) return;
                const details = memberDetails.map((detail) => ({
                    ...detail,
                    referralIncome: incomeByDirect[detail.address.toLowerCase()] ?? detail.referralIncome ?? '0',
                }));
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
    }, [fetchDirectsForAddress, fetchMemberDetails, fetchTeamSize, supportedChainId, userInfo?.directs, viewingAddress]);

    const fetchDownlinesByLevel = useCallback(
        async (maxDepth?: number): Promise<Record<number, string[]>> => {
            const rootAddress = viewingAddress;
            if (!rootAddress) return {};
            const unlocked = userLevel > 0 ? userLevel : 1;
            const depth = Math.max(1, Math.min(maxDepth ?? unlocked, 15));
            const levels: Record<number, string[]> = {};
            const levelOne = await fetchDirectsForAddress(rootAddress, userInfo?.directs);
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
        [fetchDirectsForAddress, userInfo?.directs, userLevel, viewingAddress]
    );

    const fetchDownlineDetailsByLevel = useCallback(
        async (maxDepth?: number): Promise<Record<number, DirectDetail[]>> => {
            const base = await fetchDownlinesByLevel(maxDepth);
            const entries = await Promise.all(
                Object.entries(base).map(async ([lvl, addrs]) => {
                    const details = await fetchMemberDetails(addrs);
                    return [Number(lvl), details] as const;
                })
            );
            return entries.reduce<Record<number, DirectDetail[]>>((acc, [lvl, details]) => {
                acc[lvl] = details;
                return acc;
            }, {});
        },
        [fetchDownlinesByLevel, fetchMemberDetails]
    );

    const mapHistoryEntries = useCallback(
        async (logs: readonly {
            args?: Record<string, unknown>;
            blockNumber?: bigint | number | null;
            transactionHash?: string;
        }[]
        ): Promise<HistoryEntry[]> => {
            if (!logs.length || !publicClient) return [];

            const blockNumbers = Array.from(
                logs.reduce<Set<number>>((set, log) => {
                    const value = log.blockNumber;
                    if (value != null) {
                        set.add(Number(value));
                    }
                    return set;
                }, new Set<number>())
            );

            const timestampMap = new Map<number, number>();
            await Promise.allSettled(
                blockNumbers.map(async (bn) => {
                    try {
                        const block = await publicClient.getBlock({ blockNumber: BigInt(bn) });
                        timestampMap.set(bn, Number(block.timestamp));
                    } catch {
                        timestampMap.set(bn, 0);
                    }
                })
            );

            return logs
                .map((log) => {
                    const bn = Number(log.blockNumber ?? 0n);
                    const ts = timestampMap.get(bn) ?? 0;
                    const amt = toStr(log.args?.amount) ?? '0';
                    return {
                        amount: amt,
                        timestamp: ts,
                        txHash: log.transactionHash,
                        blockNumber: bn,
                    } satisfies HistoryEntry;
                })
                .sort((a, b) => {
                    if (a.timestamp === b.timestamp) {
                        return (b.blockNumber ?? 0) - (a.blockNumber ?? 0);
                    }
                    return b.timestamp - a.timestamp;
                });
        },
        [publicClient]
    );

    const buildHistoryPage = useCallback(
        (entries: HistoryEntry[], page: number, pageSize: number): HistoryPage => {
            const safePageSize = Math.max(1, pageSize);
            const safePage = Math.max(1, page);
            const totalItems = entries.length;
            const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / safePageSize);
            const currentPage = Math.min(safePage, totalPages);
            const start = (currentPage - 1) * safePageSize;
            const items = entries.slice(start, start + safePageSize);
            return {
                items,
                page: currentPage,
                pageSize: safePageSize,
                totalItems,
                totalPages,
            };
        },
        [],
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

    const fetchHistoryFromEvents = useCallback(
        async (
            kind: Extract<ActivityKind, 'STAKE' | 'UNSTAKE'>,
            options?: { page?: number; pageSize?: number; fromBlock?: bigint; toBlock?: bigint; maxBlocksBack?: number }
        ): Promise<HistoryPage> => {
            const DEFAULT_PAGE_SIZE = 10;
            if (!viewingAddress || !publicClient) {
                return buildHistoryPage([], options?.page ?? 1, options?.pageSize ?? DEFAULT_PAGE_SIZE);
            }

            const latest = await publicClient.getBlockNumber();
            const event = kind === 'STAKE' ? EVT.Staked : EVT.Unstaked;
            const maxBlocksBack = options?.maxBlocksBack != null ? BigInt(Math.max(0, options.maxBlocksBack)) : DEFAULT_LOG_LOOKBACK;
            const defaultFromBlock = maxBlocksBack > 0n && latest > maxBlocksBack ? latest - maxBlocksBack : 0n;
            const fromBlock = options?.fromBlock ?? defaultFromBlock;
            const toBlock = options?.toBlock ?? latest;

            type LogRange = { from: bigint; to: bigint };

            const ranges: LogRange[] = [{ from: fromBlock, to: toBlock }];
            const collected: Array<{ args?: Record<string, unknown>; blockNumber?: bigint | number | null; transactionHash?: string }> = [];
            const visited = new Set<string>();
            let encounteredPruned = false;
            let encounteredNetworkError = false;

            while (ranges.length) {
                const { from, to } = ranges.pop() as LogRange;
                if (from > to) continue;
                const key = `${from}-${to}`;
                if (visited.has(key)) continue;
                visited.add(key);
                try {
                    const slice = await publicClient.getLogs({
                        address: CONTRACT_ADDRESS,
                        event,
                        args: { user: viewingAddress },
                        fromBlock: from,
                        toBlock: to,
                    });
                    collected.push(...(slice as Array<{ args?: Record<string, unknown>; blockNumber?: bigint | number | null; transactionHash?: string }>));
                } catch (error) {
                    if (isNetworkTransportError(error)) {
                        encounteredNetworkError = true;
                        console.warn('getLogs network error', {
                            from: from.toString(),
                            to: to.toString(),
                            error,
                        });
                        break;
                    }
                    if (isPrunedHistoryError(error)) {
                        encounteredPruned = true;
                        const span = to > from ? to - from : 0n;
                        const window = PRUNED_RETRY_WINDOW > 0n ? PRUNED_RETRY_WINDOW : span;
                        let adjustedFrom = to > window ? to - window : 0n;
                        if (adjustedFrom <= from) {
                            const half = span > 1n ? span / 2n : 1n;
                            adjustedFrom = to > half ? to - half : (from < to ? from + 1n : from);
                        }
                        if (adjustedFrom < to) {
                            ranges.push({ from: adjustedFrom, to });
                        }
                        console.warn('getLogs pruned history window', {
                            from: from.toString(),
                            to: to.toString(),
                            adjustedFrom: adjustedFrom.toString(),
                            error,
                        });
                        continue;
                    }
                    const span = to - from;
                    if (span <= MIN_LOG_SPLIT_THRESHOLD) {
                        console.warn('getLogs range failed', { from: from.toString(), to: to.toString(), error });
                        continue;
                    }
                    const mid = from + span / 2n;
                    ranges.push({ from, to: mid }, { from: mid + 1n, to });
                }
            }

            if (encounteredNetworkError) {
                console.warn('Aborting history fetch due to persistent network/transport error. Configure a reliable RPC endpoint.');
                return buildHistoryPage([], options?.page ?? 1, options?.pageSize ?? DEFAULT_PAGE_SIZE);
            }

            collected.sort((a, b) => {
                const aNum = Number((a.blockNumber ?? 0) as number | bigint);
                const bNum = Number((b.blockNumber ?? 0) as number | bigint);
                return aNum - bNum;
            });

            const entries = await mapHistoryEntries(collected);
            if (encounteredPruned) {
                console.warn('Some staking history is beyond the current RPC archive window. Configure VITE_BSC_RPC_URL with an archive node to load older events.');
            }
            return buildHistoryPage(entries, options?.page ?? 1, options?.pageSize ?? DEFAULT_PAGE_SIZE);
        },
        [EVT.Staked, EVT.Unstaked, buildHistoryPage, mapHistoryEntries, publicClient, viewingAddress]
    );

    const fetchUserActivity = useCallback(
        async (options?: {
            fromBlock?: bigint;
            toBlock?: bigint;
            maxBlocksBack?: number;
            includeToken?: boolean;
            includeApprovals?: boolean;
        }): Promise<ActivityItem[]> => {
            if (!viewingAddress || !publicClient) return [];

            const latest = await publicClient.getBlockNumber();
            const defaultBackNumber = bigintToSafeNumber(DEFAULT_LOG_LOOKBACK, 200_000);
            const maxBack = BigInt(options?.maxBlocksBack ?? defaultBackNumber);
            const fromBlock = options?.fromBlock ?? (latest > maxBack ? latest - maxBack : 0n);
            const toBlock = options?.toBlock ?? latest;

            const acct = viewingAddress;
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
        [publicClient, EVT, ERC20_EVT, viewingAddress]
    );

    const fetchLevelIncomeEvents = useCallback(
        async (options?: { fromBlock?: bigint; toBlock?: bigint; maxBlocksBack?: number }): Promise<LevelIncomeEvent[]> => {
            if (!viewingAddress || !publicClient) return [];

            try {
                const latest = await publicClient.getBlockNumber();
                const maxBack = BigInt(options?.maxBlocksBack ?? 200_000);
                const fromBlock = options?.fromBlock ?? (latest > maxBack ? latest - maxBack : 0n);
                const toBlock = options?.toBlock ?? latest;

                const logs = await publicClient.getLogs({
                    address: CONTRACT_ADDRESS,
                    event: EVT.ReferralCreditedFromPool,
                    args: { to: viewingAddress },
                    fromBlock,
                    toBlock,
                });

                const blockNumbers = Array.from(
                    logs.reduce<Set<number>>((set, log) => {
                        const value = (log as { blockNumber?: bigint | number | null }).blockNumber;
                        if (value != null) set.add(Number(value));
                        return set;
                    }, new Set<number>())
                );

                const blockTimestampMap = new Map<number, number>();
                await Promise.allSettled(
                    blockNumbers.map(async (bn) => {
                        try {
                            const block = await publicClient.getBlock({ blockNumber: BigInt(bn) });
                            blockTimestampMap.set(bn, Number(block.timestamp));
                        } catch {
                            blockTimestampMap.set(bn, 0);
                        }
                    })
                );

                return (logs as Array<{ args?: Record<string, unknown>; transactionHash: string; blockNumber?: bigint | number | null }>).
                    map((log) => {
                        const args = log.args ?? {};
                        const blockNum = Number(log.blockNumber ?? 0n);
                        return {
                            txHash: log.transactionHash,
                            blockNumber: blockNum,
                            timestamp: blockTimestampMap.get(blockNum) ?? 0,
                            amount: toStr(args.amount) ?? '0',
                            from: toStr(args.from),
                            levelIndex: toNum(args.levelIndex) ?? 0,
                        } satisfies LevelIncomeEvent;
                    })
                    .sort((a, b) => {
                        if (a.timestamp === b.timestamp) {
                            return b.blockNumber - a.blockNumber;
                        }
                        return b.timestamp - a.timestamp;
                    });
            } catch (error) {
                console.error('fetchLevelIncomeEvents error', error);
                return [];
            }
        },
        [EVT, publicClient, viewingAddress]
    );

    const fetchStakeHistory = useCallback(
        async (options?: { page?: number; pageSize?: number }) => {
            return fetchHistoryFromEvents('STAKE', options);
        },
        [fetchHistoryFromEvents]
    );

    const fetchUnstakeHistory = useCallback(
        async (options?: { page?: number; pageSize?: number }) => {
            return fetchHistoryFromEvents('UNSTAKE', options);
        },
        [fetchHistoryFromEvents]
    );

    const fetchRoiHistory = useCallback(async (wallet?: `0x${string}`) => {
        const targetAddress = wallet ?? viewingAddress;
        if (!targetAddress) return [] as Array<{ amount: string; timestamp: number }>;
        try {
            const limitRaw = await readContractSafe<unknown>({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'ROI_HISTORY_LIMIT',
                chainId: supportedChainId,
            });
            const limit = Number(extractString(limitRaw) ?? '10');
            const size = Number.isNaN(limit) || limit <= 0 ? 10 : Math.min(limit, 25);

            const reads = await Promise.allSettled(
                Array.from({ length: size }, (_, idx) =>
                    readContractSafe<unknown>({
                        address: CONTRACT_ADDRESS,
                        abi: CONTRACT_ABI,
                        functionName: 'roiHistory',
                        args: [targetAddress, BigInt(idx)],
                        chainId: supportedChainId,
                    })
                )
            );

            const DAY_SECONDS = 86_400;
            const items = reads
                .map((res) => {
                    if (res.status !== 'fulfilled' || !Array.isArray(res.value)) {
                        return null;
                    }
                    const [dayRaw, amountRaw] = res.value as [unknown, unknown];
                    const amount = extractString(amountRaw) ?? '0';
                    const dayNumber = Number(extractString(dayRaw) ?? '0');
                    if (Number.isNaN(dayNumber) || (dayNumber === 0 && amount === '0')) return null;
                    const timestamp = dayNumber * DAY_SECONDS;
                    return { amount, timestamp, day: dayNumber };
                })
                .filter((entry): entry is { amount: string; timestamp: number; day: number } => Boolean(entry))
                .sort((a, b) => b.timestamp - a.timestamp);

            return items;
        } catch (err) {
            console.error('fetchRoiHistory error', err);
            return [];
        }
    }, [supportedChainId, viewingAddress]);

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
        blockUser: blockUserAddress,
        unblockUser: unblockUserAddress,
        fetchUserLevelIncome,
        fetchUserActivity,
        mapHistoryEntries,
        buildHistoryPage,
        fetchDownlinesByLevel,
        fetchDownlineDetailsByLevel,
        fetchMemberDetails,
        fetchStakeHistory,
        fetchUnstakeHistory,
        fetchLevelIncomeEvents,
        fetchROIHistoryFull,
        fetchLastNROIEvents,
        fetchUserRoiHistory: fetchRoiHistory,
        directsList,
        directsWithBalances,
        loadingDirects,
        teamSize,
        fetchTeamSize,
        fetchTotalUsers,
        fetchUsersBatch,
        fetchCompanyPoolStatus,
        refetchTotalStaked,
        refetchUserInfo,
        refetchPendingRewards,
        refetchTokenBalance,
        refetchTokenAllowance,
    };
}

export type { LevelIncomeEvent, DirectDetail };
