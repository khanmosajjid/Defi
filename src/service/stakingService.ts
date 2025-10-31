import { useAccount, useReadContract, useChainId } from 'wagmi';
import type { Abi } from 'abitype';
import { writeAndWaitForReceipt } from '@/lib/wagmiWrite';
import { toast } from 'react-hot-toast'
import { parseEther, parseAbiItem } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import CONTRACT_ABI from '@/service/stakingABI.json';
import { readContract, getPublicClient } from '@wagmi/core';
import { config } from '@/lib/wagmiConfig';

// minimal ERC20 ABI for balance/allowance/approve
const ERC20_ABI = [
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "type": "function" },
    { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "success", "type": "bool" }], "type": "function" }
];

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.stakingPlatform;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_UINT = (2n ** 256n - 1n).toString();
// Approve a large, but finite amount: 1,000,000 tokens (assuming 18 decimals)
const APPROVE_AMOUNT = (1000000n * (10n ** 18n));

export function useStakingContract() {
    const { address } = useAccount();
    const chainId = useChainId();

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

    // Read contract token balance as proxy for total staked (contract holds staked tokens)
    const { data: totalStakedRaw, refetch: refetchTotalStaked } = useReadContract({
        address: CONTRACT_ADDRESSES.token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CONTRACT_ADDRESS],
    });

    // Read user info via public mapping `users(address)` which returns full struct
    const { data: userInfoRaw, refetch: refetchUserInfo } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'users',
        args: [address],
        // only run when we have an address and watch for new blocks so pending rewards/user info updates

    });

    // Read pending rewards separately
    const { data: pendingRewardsRaw, refetch: refetchPendingRewards } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'pendingRewards',
        args: [address],
        // only read when connected and watch to keep value fresh


    });

    // Read manual token price from staking contract (manualTokenPrice) - fallback to 2 USD if not set
    const { data: manualTokenPriceRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'manualTokenPrice',
    });

    // Read computed token price from contract (e.g., via pricePair oracle)
    const { data: tokenPriceUsdRaw, refetch: refetchTokenPrice } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getTokenPriceUsd18',
    });

    // read dailyRate (per-day rate in 1e18 fixed, e.g., 1e16 == 1%) so we can locally compute pending if needed
    const { data: dailyRateRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'dailyRate',
    });

    // Token balance & allowance
    const TOKEN_ADDRESS = CONTRACT_ADDRESSES.token;
    const { data: tokenBalanceRaw, refetch: refetchTokenBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],

    });

    const { data: tokenAllowanceRaw, refetch: refetchTokenAllowance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESS],

    });

    // small helpers
    function shortenAddress(addr: string | null | undefined) {
        if (!addr) return '';
        if (addr === ZERO_ADDRESS) return 'No referrer';
        try {
            const a = addr.toString();
            if (a.length <= 12) return a;
            return `${a.slice(0, 6)}...${a.slice(-4)}`;
        } catch {
            return addr;
        }
    }

    // defensively extract numeric string from read/refetch results which may be wrapped objects
    function extractString(res: unknown) {
        try {
            if (res == null) return null;
            // wagmi refetch often returns an object like { data: <value>, error: null, status: 'success' }
            if (typeof res === 'object') {
                if ('data' in (res as Record<string, unknown>)) {
                    const d = (res as Record<string, unknown>).data;
                    if (d == null) return null;
                    if (typeof d === 'bigint') return d.toString();
                    if (typeof d === 'string') return d;
                    if (typeof d === 'number') return d.toString();
                    if (typeof d === 'object' && d.toString) return d.toString();
                    return JSON.stringify(d);
                }
                // fallback: if object itself has toString
                // fallback: use String() which calls toString when available
                return String(res);
            }
            return String(res);
        } catch (e) {
            return null;
        }
    }

    function formatUnits(raw?: string | number | bigint, decimals = 18) {
        if (!raw) return '0';
        try {
            const s = raw.toString();
            const bn = BigInt(s);
            const d = BigInt(decimals);
            const base = 10n ** d;
            const whole = bn / base;
            const frac = bn % base;
            return `${whole.toString()}.${frac.toString().padStart(Number(d), '0')}`;
        } catch {
            return raw.toString();
        }
    }

    // No direct useWriteContract here: we use the writeAndWaitForReceipt helper for writes that need receipt waiting
    // small safe value helpers for unknown types
    function toStr(v: unknown): string | undefined {
        if (v == null) return undefined;
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'bigint') return String(v);
        try { return String(v); } catch { return undefined; }
    }
    function toNum(v: unknown): number | undefined {
        if (v == null) return undefined;
        const t = typeof v;
        if (t === 'number') return v as number;
        if (t === 'bigint') return Number(v as bigint);
        if (t === 'string') {
            const n = Number(v as string);
            return isNaN(n) ? undefined : n;
        }
        return undefined;
    }
    function toAddr(v: unknown): string | undefined {
        return typeof v === 'string' && v.startsWith('0x') ? v : undefined;
    }

    // stake by token amount - amount is token units string
    async function stakeToken(amount: string, referrer?: string) {
        const txToast = toast.loading('Submitting stake transaction...');
        try {
            // ensure allowance >= amount
            let allowanceStr = tokenAllowanceRaw ? tokenAllowanceRaw.toString() : '0';
            try {
                const fresh = await refetchTokenAllowance();
                const s = extractString(fresh);
                if (s) allowanceStr = s;
            } catch {
                // ignore
            }
            const allowance = BigInt(allowanceStr);
            const amountWei = parseEther(amount);
            if (allowance < amountWei) {
                const approveToast = toast.loading('Approving token spend...');
                try {
                    const approveReceipt = await writeAndWaitForReceipt({
                        abi: ERC20_ABI as Abi,
                        address: TOKEN_ADDRESS,
                        functionName: 'approve',
                        args: [CONTRACT_ADDRESS, APPROVE_AMOUNT],
                    });
                    console.log('approveReceipt', approveReceipt);
                    toast.success('Approval confirmed', { id: approveToast });
                    try {
                        await refetchTokenAllowance();
                        await refetchTokenBalance();
                    } catch (e) {
                        // ignore
                    }
                } catch (err) {
                    console.error('approve error', err);
                    const msg = getErrorMessage(err) || 'Approval failed or cancelled';
                    toast.error(msg, { id: approveToast });
                    throw err;
                }
            }

            const ref = referrer && typeof referrer === 'string' && referrer.startsWith('0x') ? referrer : (address ?? ZERO_ADDRESS);
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'stake',
                args: [amountWei, ref],
            });
            console.log('stake receipt', receipt);
            toast.success('Stake transaction confirmed', { id: txToast });
            try {
                await refetchTokenAllowance();
                await refetchTokenBalance();
            } catch (e) {
                // ignore
            }
            return receipt;
        } catch (err) {
            console.error('stake error', err);
            const message = getErrorMessage(err) || 'Stake transaction failed or was cancelled';
            toast.error(message, { id: txToast });
            throw err;
        }
    }

    // stake by USD amount (e.g., 300 means $300 worth of tokens). Uses on-chain price (18 decimals USD)
    async function stakeUsd(usdAmount: string, referrer?: string) {
        try {
            // parse inputs safely
            const usdFloat = parseFloat(usdAmount || '0');
            if (isNaN(usdFloat) || usdFloat <= 0) throw new Error('Invalid USD amount');

            const usd18 = BigInt(Math.round(usdFloat * 1e18)); // usd with 18 decimals

            // price18 from oracle (preferred) then manual fallback
            const priceStr = tokenPriceUsdRaw?.toString?.() ?? '0';
            const manualStr = manualTokenPriceRaw?.toString?.() ?? '0';
            let price18 = 0n;
            try {
                const p = BigInt(priceStr);
                if (p > 0n) price18 = p;
            } catch {
                // ignore parse fallback
            }
            if (price18 === 0n) {
                try {
                    const p = BigInt(manualStr);
                    if (p > 0n) price18 = p;
                } catch {
                    // ignore parse fallback
                }
            }
            if (price18 === 0n) throw new Error('Token price unavailable');

            // tokenAmount = usd18 * 1e18 / price18
            const tokenAmountBig = (usd18 * 1000000000000000000n) / price18;

            // refresh allowance to ensure we have the latest on-chain value
            let allowanceStr = tokenAllowanceRaw ? tokenAllowanceRaw.toString() : '0';
            try {
                const fresh = await refetchTokenAllowance();
                const s = extractString(fresh);
                if (s) allowanceStr = s;
            } catch (e) {
                // ignore and continue with cached value
            }
            const allowance = BigInt(allowanceStr);
            // If allowance is insufficient, approve MAX_UINT to avoid future approvals
            if (allowance < tokenAmountBig) {
                const approveToast = toast.loading('Approving token spend...');
                try {
                    const approveReceipt = await writeAndWaitForReceipt({
                        abi: ERC20_ABI as Abi,
                        address: TOKEN_ADDRESS,
                        functionName: 'approve',
                        args: [CONTRACT_ADDRESS, APPROVE_AMOUNT],
                    });
                    console.log('approveReceipt', approveReceipt);
                    toast.success('Approval confirmed', { id: approveToast });
                    try {
                        await refetchTokenAllowance();
                        await refetchTokenBalance();
                    } catch (e) {
                        // ignore
                    }
                } catch (err) {
                    console.error('approve error', err);
                    const msg = getErrorMessage(err) || 'Approval failed or cancelled';
                    toast.error(msg, { id: approveToast });
                    throw err; // bubble up so overall flow stops
                }
            }

            // convert tokenAmountBig (raw units with token decimals 18) into decimal string for stake(amount)
            const tokenAmountStr = formatUnits(tokenAmountBig, 18);

            // ensure a referrer (use connected address if none provided)
            const finalRef = referrer && typeof referrer === 'string' && referrer.startsWith('0x') ? referrer : (address ?? ZERO_ADDRESS);
            // call stake with token-amount string (parseEther expects a numeric string)
            await stakeToken(tokenAmountStr, finalRef);
        } catch (err) {
            console.error('stakeUsd failed', err);
            const msg = getErrorMessage(err) || 'StakeUSD failed';
            toast.error(msg);
            throw err;
        }
    }

    // Wait for TX confirmation (handled per-write via receipts)

    // Example: withdraw function
    async function unstake(amount: string) {
        const txToast = toast.loading('Unstaking in progress...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'unstake',
                args: [parseEther(amount)],
            });
            console.log('unstake receipt', receipt);
            toast.success('Unstake transaction confirmed', { id: txToast });
            try {
                await refetchTokenBalance();
                await refetchTokenAllowance();
            } catch (e) {
                // ignore
            }
            return receipt;
        } catch (err) {
            console.error('unstake error', err);
            const msg = getErrorMessage(err) || 'Unstake failed!';
            toast.error(msg, { id: txToast });
            throw err;
        }
    }

    // Claim accumulated rewards
    async function claimRewards() {
        const txToast = toast.loading('Claiming rewards...');
        try {
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'claimRewards',
                args: [],
            });
            console.log('claimRewards receipt', receipt);
            toast.success('Rewards claimed', { id: txToast });
            try {
                await refetchPendingRewards();
                await refetchUserInfo();
                await refetchTokenBalance();
            } catch (e) {
                // ignore
            }
            return receipt;
        } catch (err) {
            console.error('claimRewards error', err);
            const msg = getErrorMessage(err) || 'Claim rewards failed';
            toast.error(msg, { id: txToast });
            throw err;
        }
    }

    // Map userInfoRaw to friendly fields
    const userInfo = userInfoRaw
        ? (() => {
            // normalize level: contract uses uint8 max (255) to mean NO_LEVEL
            const rawLevelStr = extractString(userInfoRaw[7]) ?? '0';
            let level = 0;
            try {
                const rawLevelBn = BigInt(rawLevelStr);
                if (rawLevelBn === 255n) {
                    level = 0;
                } else if (rawLevelBn <= 1000000n) {
                    // safe clamp to avoid accidentally converting huge scientific notation to Number
                    level = Number(rawLevelBn);
                } else {
                    level = 0;
                }
            } catch {
                level = 0;
            }


            return {
                // per contract users mapping order:
                // [0] selfStaked
                // [1] selfStakedUsdLocked
                // [2] rewardDebt
                // [3] lastAccruedAt
                // [4] lastClaimAt
                // [5] referrer
                // [6] directs
                // [7] level (0..14 or 255 NO_LEVEL)
                // [8] rank (0..5)
                // [9] totalReferralIncome
                // [10] totalEarned
                // [11] totalClaimed
                selfStaked: extractString(userInfoRaw[0]) ?? '0',
                selfStakedUsdLocked: extractString(userInfoRaw[1]) ?? '0',
                rewardDebt: extractString(userInfoRaw[2]) ?? '0',
                lastAccruedAt: extractString(userInfoRaw[3]) ?? '0',
                lastClaimAt: extractString(userInfoRaw[4]) ?? '0',
                referrer: userInfoRaw[5] ?? ZERO_ADDRESS,
                referrerShort: shortenAddress(userInfoRaw[5]),
                directs: Number(extractString(userInfoRaw[6]) ?? 0),
                // normalized level (0 means no level)
                level,
                rank: Number(extractString(userInfoRaw[8]) ?? 0),
                totalReferralIncome: extractString(userInfoRaw[9]) ?? '0',
                totalEarned: extractString(userInfoRaw[10]) ?? '0',
                totalClaimed: extractString(userInfoRaw[11]) ?? '0',
            };
        })()
        : null;

    // read the level details for the user's current level (levels are 0-indexed in contract input -> returns struct)
    // compute level index for contract call: only valid when level > 0 and not NO_LEVEL (255)
    const rawLevelStrForIndex = userInfoRaw ? extractString(userInfoRaw[7]) ?? '0' : '0';
    let rawLevelVal = 0;
    try {
        const bn = BigInt(rawLevelStrForIndex);
        rawLevelVal = bn === 255n ? 0 : (bn <= 1000000n ? Number(bn) : 0);
    } catch {
        rawLevelVal = 0;
    }
    const userLevelIndex = rawLevelVal > 0 ? rawLevelVal - 1 : -1;
    const { data: levelRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'levels',
        args: userLevelIndex >= 0 ? [userLevelIndex] : [0],
    });

    const userRewardPercent = levelRaw ? Number(levelRaw[0] ?? 0) : 0;

    // Rank details for the user's current rank
    const rawRankStrForIndex = userInfoRaw ? extractString(userInfoRaw[8]) ?? '0' : '0';
    let rawRankVal = 0;
    try {
        const bn = BigInt(rawRankStrForIndex);
        rawRankVal = bn <= 1000000n ? Number(bn) : 0;
    } catch {
        rawRankVal = 0;
    }
    const userRankIndex = rawRankVal > 0 ? rawRankVal - 1 : -1;
    const { data: rankRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'ranks',
        args: userRankIndex >= 0 ? [userRankIndex] : [0],
    });

    const rankInfo = rankRaw
        ? {
            incomeReqFromTop3Usd: extractString(rankRaw[0]) ?? '0',
            directReq: extractString(rankRaw[1]) ?? '0',
            companySharePercent: Number(extractString(rankRaw[2]) ?? '0'),
        }
        : null;

    const pendingRewards = pendingRewardsRaw ? pendingRewardsRaw.toString() : '0';
    const pendingRewardsHuman = pendingRewardsRaw ? formatUnits(pendingRewardsRaw.toString(), 18) : '0';

    // fallback: compute pending locally when pendingRewards read returns 0 but user has stake and lastAccruedAt
    let pendingComputed = '0';
    let pendingComputedHuman = '0';
    try {
        const selfStakedStr = userInfo?.selfStaked ?? '0';
        const rewardDebtStr = userInfo?.rewardDebt ?? '0';
        const lastAcc = userInfo?.lastAccruedAt ?? '0';
        const selfStakedBn = BigInt(selfStakedStr);
        const rewardDebtBn = BigInt(rewardDebtStr);
        const lastAccBn = BigInt(lastAcc);

        if (selfStakedBn > 0n && lastAccBn > 0n) {
            const nowSec = BigInt(Math.floor(Date.now() / 1000));
            const elapsed = nowSec > lastAccBn ? nowSec - lastAccBn : 0n;
            const dailyRateBn = dailyRateRaw ? BigInt(dailyRateRaw.toString()) : 10000000000000000n; // default 1e16
            const RATE_DECIMALS_BN = 1000000000000000000n; // 1e18

            // reward = (selfStaked * dailyRate * elapsed) / RATE_DECIMALS / 86400
            const reward = (selfStakedBn * dailyRateBn * elapsed) / RATE_DECIMALS_BN / 86400n;
            const total = rewardDebtBn + reward;
            pendingComputed = total.toString();
            pendingComputedHuman = formatUnits(pendingComputed, 18);
        }
    } catch (e) {
        // ignore computation errors
    }

    // Helper to fetch user's bonds list with plan metadata
    async function fetchUserBonds() {
        if (!address) return [] as Array<{
            index: number;
            planId: number;
            amount: string;
            amountHuman: string;
            startAt: number;
            endAt: number;
            withdrawn: boolean;
            duration: string;
            rewardPercent: number;
            status: 'Active' | 'Matured' | 'Withdrawn';
        }>;
        try {
            const bondsLenParams = {
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CONTRACT_ABI as Abi,
                functionName: 'bondsLength',
                args: [address as `0x${string}`],
            } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            const bondsLenBn = await readContract(config, bondsLenParams) as bigint;
            const count = Number(bondsLenBn ?? 0n);
            const results: Array<{
                index: number;
                planId: number;
                amount: string;
                amountHuman: string;
                startAt: number;
                endAt: number;
                withdrawn: boolean;
                duration: string;
                rewardPercent: number;
                status: 'Active' | 'Matured' | 'Withdrawn';
            }> = [];
            for (let i = 0; i < count; i++) {
                const userBondsParams = {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: CONTRACT_ABI as Abi,
                    functionName: 'userBonds',
                    args: [address as `0x${string}`, BigInt(i)],
                } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                const b = await readContract(config, userBondsParams) as readonly [bigint, bigint, bigint, boolean];
                const planId = Number(b[0] ?? 0n);
                const amount = (b[1] ?? 0n).toString();
                const startAt = Number(b[2] ?? 0n);
                const withdrawn = Boolean(b[3]);

                // fetch plan metadata
                const bondPlanParams = {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: CONTRACT_ABI as Abi,
                    functionName: 'bondPlans',
                    args: [BigInt(planId)],
                } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                const plan = await readContract(config, bondPlanParams) as readonly [bigint, bigint, boolean];
                const duration = (plan?.[0] ?? 0n).toString();
                const rewardPercent = Number(plan?.[1] ?? 0n);
                const endAt = startAt + Number(duration || '0');
                const now = Math.floor(Date.now() / 1000);
                let status: 'Active' | 'Matured' | 'Withdrawn' = 'Active';
                if (withdrawn) status = 'Withdrawn';
                else if (now >= endAt) status = 'Matured';
                results.push({
                    index: i,
                    planId,
                    amount,
                    amountHuman: formatUnits(amount, 18),
                    startAt,
                    endAt,
                    withdrawn,
                    duration,
                    rewardPercent,
                    status,
                });
            }
            return results;
        } catch (e) {
            console.error('fetchUserBonds error', e);
            return [];
        }
    }

    // -----------------------------
    // Activity & Transactions (events)
    // -----------------------------
    type ActivityItem = {
        kind:
        | 'STAKE'
        | 'UNSTAKE'
        | 'CLAIM'
        | 'COMPOUND'
        | 'REFERRAL_IN'
        | 'REFERRAL_OUT'
        | 'BOND_BUY'
        | 'BOND_WITHDRAW'
        | 'LEVEL'
        | 'RANK'
        | 'TOKEN_TRANSFER_IN'
        | 'TOKEN_TRANSFER_OUT'
        | 'TOKEN_APPROVAL';
        txHash: string;
        blockNumber: number;
        amount?: string;
        counterparty?: string;
        meta?: Record<string, unknown>;
    };

    const EVT = {
        Staked: parseAbiItem('event Staked(address indexed user, uint256 amount, address indexed referrer, uint256 usdLocked)'),
        Unstaked: parseAbiItem('event Unstaked(address indexed user, uint256 amount, uint256 usdReduced)'),
        RewardClaimed: parseAbiItem('event RewardClaimed(address indexed user, uint256 amount)'),
        ReferralPaid: parseAbiItem('event ReferralPaid(address indexed from, address indexed to, uint256 amount, uint8 toLevelIndex)'),
        Compounded: parseAbiItem('event Compounded(address indexed user, uint256 amount)'),
        BondPurchased: parseAbiItem('event BondPurchased(address indexed user, uint8 planId, uint256 amount)'),
        BondWithdrawn: parseAbiItem('event BondWithdrawn(address indexed user, uint8 planId, uint256 amount)'),
        LevelUpdated: parseAbiItem('event LevelUpdated(address indexed user, uint8 oldLevel, uint8 newLevel)'),
        RankUpdated: parseAbiItem('event RankUpdated(address indexed user, uint8 oldRank, uint8 newRank)'),
    } as const;

    const ERC20_EVT = {
        Transfer: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        Approval: parseAbiItem('event Approval(address indexed owner, address indexed spender, uint256 value)'),
    } as const;

    async function fetchUserActivity(options?: {
        fromBlock?: bigint;
        toBlock?: bigint;
        maxBlocksBack?: number;
        includeToken?: boolean;
        includeApprovals?: boolean;
    }): Promise<ActivityItem[]> {
        if (!address) return [];
        const supportedChainId = ((cid: number): 1 | 10 | 97 | 137 | 42161 | 8453 => {
            switch (cid) {
                case 1:
                case 10:
                case 97:
                case 137:
                case 42161:
                case 8453:
                    return cid as 1 | 10 | 97 | 137 | 42161 | 8453;
                default:
                    return 97;
            }
        })(chainId);
        const pc = getPublicClient(config, { chainId: supportedChainId });
        if (!pc) return [];

        const latest = await pc.getBlockNumber();
        const maxBack = BigInt(options?.maxBlocksBack ?? 200_000);
        const fromBlock = options?.fromBlock ?? (latest > maxBack ? latest - maxBack : 0n);
        const toBlock = options?.toBlock ?? latest;

        const acct = address as `0x${string}`;
        const stakingAddr = CONTRACT_ADDRESS as `0x${string}`;
        const tokenAddr = CONTRACT_ADDRESSES.token as `0x${string}`;

        const [staked, unstaked, claimed, compounded, refPaidTo, refPaidFrom, bondBuy, bondWd, lvlUpd, rnkUpd] = await Promise.all([
            pc.getLogs({ address: stakingAddr, event: EVT.Staked, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.Unstaked, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.RewardClaimed, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.Compounded, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.ReferralPaid, args: { to: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.ReferralPaid, args: { from: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.BondPurchased, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.BondWithdrawn, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.LevelUpdated, args: { user: acct }, fromBlock, toBlock }),
            pc.getLogs({ address: stakingAddr, event: EVT.RankUpdated, args: { user: acct }, fromBlock, toBlock }),
        ]);

        const items: ActivityItem[] = [];

        staked.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'STAKE',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
                counterparty: toAddr(a?.referrer),
            });
        });
        unstaked.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'UNSTAKE',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
            });
        });
        claimed.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'CLAIM',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
            });
        });
        compounded.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'COMPOUND',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
            });
        });
        refPaidTo.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'REFERRAL_IN',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
                counterparty: toAddr(a?.from),
                meta: { levelIndex: toNum(a?.toLevelIndex) },
            });
        });
        refPaidFrom.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'REFERRAL_OUT',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
                counterparty: toAddr(a?.to),
                meta: { levelIndex: toNum(a?.toLevelIndex) },
            });
        });
        bondBuy.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'BOND_BUY',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
                meta: { planId: toNum(a?.planId) },
            });
        });
        bondWd.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'BOND_WITHDRAW',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                amount: toStr(a?.amount),
                meta: { planId: toNum(a?.planId) },
            });
        });
        lvlUpd.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'LEVEL',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                meta: {
                    oldLevel: toNum(a?.oldLevel),
                    newLevel: toNum(a?.newLevel),
                },
            });
        });
        rnkUpd.forEach((l) => {
            const a = (l as { args?: Record<string, unknown> }).args;
            items.push({
                kind: 'RANK',
                txHash: l.transactionHash,
                blockNumber: Number(l.blockNumber ?? 0n),
                meta: {
                    oldRank: toNum(a?.oldRank),
                    newRank: toNum(a?.newRank),
                },
            });
        });

        if (options?.includeToken !== false) {
            const [transfersIn, transfersOut] = await Promise.all([
                pc.getLogs({ address: tokenAddr, event: ERC20_EVT.Transfer, args: { to: acct }, fromBlock, toBlock }),
                pc.getLogs({ address: tokenAddr, event: ERC20_EVT.Transfer, args: { from: acct }, fromBlock, toBlock }),
            ]);
            transfersIn.forEach((l) => {
                const a = (l as { args?: Record<string, unknown> }).args;
                items.push({
                    kind: 'TOKEN_TRANSFER_IN',
                    txHash: l.transactionHash,
                    blockNumber: Number(l.blockNumber ?? 0n),
                    amount: toStr(a?.value),
                    counterparty: toAddr(a?.from),
                });
            });
            transfersOut.forEach((l) => {
                const a = (l as { args?: Record<string, unknown> }).args;
                items.push({
                    kind: 'TOKEN_TRANSFER_OUT',
                    txHash: l.transactionHash,
                    blockNumber: Number(l.blockNumber ?? 0n),
                    amount: toStr(a?.value),
                    counterparty: toAddr(a?.to),
                });
            });

            if (options?.includeApprovals) {
                const approvals = await pc.getLogs({ address: tokenAddr, event: ERC20_EVT.Approval, args: { owner: acct }, fromBlock, toBlock });
                approvals.forEach((l) => {
                    const a = (l as { args?: Record<string, unknown> }).args;
                    items.push({
                        kind: 'TOKEN_APPROVAL',
                        txHash: l.transactionHash,
                        blockNumber: Number(l.blockNumber ?? 0n),
                        amount: toStr(a?.value),
                        counterparty: toAddr(a?.spender),
                    });
                });
            }
        }

        items.sort((a, b) => (b.blockNumber - a.blockNumber) || a.txHash.localeCompare(b.txHash));
        return items;
    }

    // -----------------------------
    // Downlines by Level (multi-level team)
    // -----------------------------
    async function fetchDownlinesByLevel(maxDepth?: number): Promise<Record<number, string[]>> {
        if (!address) return {};
        // default depth: user's display level or up to 15
        const unlocked = userInfo?.level ?? 0;
        const depth = Math.max(1, maxDepth ?? (unlocked > 0 ? unlocked : 1));

        const levels: Record<number, string[]> = {};
        levels[1] = Array.isArray(directsList) ? [...directsList] : [];

        let currentLevel = 1;
        let frontier = levels[1];
        while (currentLevel < depth && frontier.length > 0) {
            const nextLevel = currentLevel + 1;
            const next: string[] = [];
            const reads = await Promise.all(
                frontier.map((addr) =>
                    readContract(config, ({
                        address: CONTRACT_ADDRESS as `0x${string}`,
                        abi: CONTRACT_ABI as Abi,
                        functionName: 'getDirects',
                        args: [addr as `0x${string}`],
                    } as any)) as Promise<readonly string[]> // eslint-disable-line @typescript-eslint/no-explicit-any
                )
            );
            for (const arr of reads) {
                if (Array.isArray(arr)) next.push(...arr);
            }
            levels[nextLevel] = next;
            frontier = next;
            currentLevel = nextLevel;
        }
        return levels;
    }

    // Read user report (aggregated stats)
    const { data: userReportRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getUserReport',
        args: [address],
    });

    const userReport = userReportRaw ? {
        selfStaked: extractString(userReportRaw[0]) ?? '0',
        selfStakedUsdLocked: extractString(userReportRaw[1]) ?? '0',
        pendingReward: extractString(userReportRaw[2]) ?? '0',
        lastAccruedAt: extractString(userReportRaw[3]) ?? '0',
        lastClaimAt: extractString(userReportRaw[4]) ?? '0',
        displayLevel: Number(extractString(userReportRaw[5]) ?? '0'),
        rank: Number(extractString(userReportRaw[6]) ?? '0'),
        directs: Number(extractString(userReportRaw[7]) ?? '0'),
        totalReferralIncome: extractString(userReportRaw[8]) ?? '0',
        totalEarned: extractString(userReportRaw[9]) ?? '0',
        totalClaimed: extractString(userReportRaw[10]) ?? '0',
    } : null;

    // Directs list
    const { data: directsListRaw } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getDirects',
        args: [address],
    });

    const directsList = Array.isArray(directsListRaw) ? (directsListRaw as string[]) : [];

    // Fetch per-level income (0..14). Return array of strings (token units)
    async function fetchUserLevelIncome() {
        if (!address) return Array(15).fill('0') as string[];
        const result: string[] = [];
        for (let i = 0; i < 15; i++) {
            try {
                const levelIncomeParams = {
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: CONTRACT_ABI as Abi,
                    functionName: 'getUserLevelIncome',
                    args: [address as `0x${string}`, BigInt(i)],
                } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                const v = await readContract(config, levelIncomeParams) as bigint;
                result.push(v?.toString() ?? '0');
            } catch (e) {
                result.push('0');
            }
        }
        return result;
    }

    return {
        totalStaked: totalStakedRaw,
        userInfo,
        // user's numeric level and reward percent will be returned below
        // token-based stake and USD-based stake
        stake: stakeToken,
        stakeUsd,

        unstake,
        claimRewards,
        refetchTotalStaked,
        refetchUserInfo,
        refetchPendingRewards,
        // expose raw string forms to avoid any casts in consumers
        tokenBalance: tokenBalanceRaw ? tokenBalanceRaw.toString() : '0',
        tokenAllowance: tokenAllowanceRaw ? tokenAllowanceRaw.toString() : '0',
        manualTokenPrice: manualTokenPriceRaw ? manualTokenPriceRaw.toString() : '0',
        tokenPriceUsd: tokenPriceUsdRaw ? tokenPriceUsdRaw.toString() : '0',
        pendingRewards,
        pendingRewardsHuman,
        // locally computed fallback when on-chain view is stale/zero
        pendingComputed,
        pendingComputedHuman,
        // expose user's level and reward percent (if available)
        // NOTE: userInfo.level is 0 when no level; levels in contract are 1-based stored as (1..15)
        userLevel: userInfo ? userInfo.level : 0,
        userRewardPercent,
        // expose rank and level/rank details
        userRank: userInfo ? Number(userInfo.rank ?? 0) : 0,
        levelInfo: levelRaw ? {
            rewardPercent: Number(levelRaw[0] ?? 0),
            selfStakeUsdReq: extractString(levelRaw[1]) ?? '0',
            directsReq: extractString(levelRaw[2]) ?? '0',
        } : null,
        rankInfo,
        // bonds helper
        fetchUserBonds,
        // new: user report & directs
        userReport,
        directsList,
        fetchUserLevelIncome,
        // activity & team
        fetchUserActivity,
        fetchDownlinesByLevel,
    };
}
