import { useAccount, useReadContract } from 'wagmi';
import type { Abi } from 'abitype';
import { writeAndWaitForReceipt } from '@/lib/wagmiWrite';
import { toast } from 'react-hot-toast'
import { parseEther } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import CONTRACT_ABI from '@/service/stakingABI.json';

// minimal ERC20 ABI for balance/allowance/approve
const ERC20_ABI = [
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "type": "function" },
    { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "success", "type": "bool" }], "type": "function" }
];

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.stakingPlatform;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_UINT = (2n ** 256n - 1n).toString();

export function useStakingContract() {
    const { address } = useAccount();

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

    // Example: read total staked
    const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getTotalStaked',
    });

    // Read user info (note: contract function is `userInfo`)
    const { data: userInfoRaw, refetch: refetchUserInfo } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'userInfo',
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

    // stake by token amount (existing) - amount is token units string
    async function stakeToken(amount: string, referrer?: string) {
        const txToast = toast.loading('Submitting stake transaction...');
        try {
            const ref = referrer && typeof referrer === 'string' && referrer.startsWith('0x') ? referrer : (address ?? ZERO_ADDRESS);
            const receipt = await writeAndWaitForReceipt({
                abi: CONTRACT_ABI as Abi,
                address: CONTRACT_ADDRESS,
                functionName: 'stake',
                args: [parseEther(amount), ref],
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

    // stake by USD amount (e.g., 300 means $300 worth of tokens). Uses manualTokenPrice (18 decimals USD)
    async function stake(usdAmount: string, referrer?: string) {
        try {

            console.log("stake USD has been called");
            // parse inputs safely
            const usdFloat = parseFloat(usdAmount || '0');
            if (isNaN(usdFloat) || usdFloat <= 0) throw new Error('Invalid USD amount');

            const usd = BigInt(Math.round(usdFloat * 1e18)); // usd with 18 decimals



            // compute token amount in token's smallest units (18 decimals)
            const tokenAmountBig = usd;

            // refresh allowance to ensure we have the latest on-chain value
            let allowanceStr = tokenAllowanceRaw ? tokenAllowanceRaw.toString() : '0';

            console.log("allowanceStr before refetch:", allowanceStr);

            try {
                const fresh = await refetchTokenAllowance();
                const s = extractString(fresh);
                if (s) allowanceStr = s;
            } catch (e) {
                // ignore and continue with cached value
            }
            const allowance = BigInt(allowanceStr);
            console.log("allowance is ----->", allowance);
            // If allowance is insufficient, approve MAX_UINT to avoid future approvals
            if (allowance < tokenAmountBig) {
                const approveToast = toast.loading('Approving token spend...');
                try {
                    const approveReceipt = await writeAndWaitForReceipt({
                        abi: ERC20_ABI as Abi,
                        address: TOKEN_ADDRESS,
                        functionName: 'approve',
                        args: [CONTRACT_ADDRESS, BigInt(Math.round(usdFloat * 1e20))],
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
                // per contract: [0]selfStaked, [1]selfStakedUsdLocked, [2]rewardDebt, [3]lastAccruedAt,
                // [4]lastClaimAt, [5]referrer, [6]directs, [7]level, [8]rank, [9]totalReferralIncome
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

    return {
        totalStaked,
        userInfo,
        // user's numeric level and reward percent will be returned below
        // token-based stake and USD-based stake
        stake,

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
    };
}
