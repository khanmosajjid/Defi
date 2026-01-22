import { getAccount, readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/lib/wagmiConfig'
import { PANCAKESWAP_V2_ADDRESSES, PANCAKESWAP_V2_ROUTER_ABI, ERC20_ABI } from '@/lib/constants'
import { parseUnits, formatUnits } from 'viem'
import { bsc, bscTestnet } from 'wagmi/chains'

const MAX_UINT = (2n ** 256n - 1n).toString();

export class SwapService {
    private static resolveChainId(chainIdOverride?: number): typeof bsc.id | typeof bscTestnet.id {
        const accountState = getAccount(config)
        const candidate = chainIdOverride ?? accountState.chainId
        if (candidate === bsc.id || candidate === bscTestnet.id) {
            return candidate
        }
        return bsc.id
    }

    private static getChainContext(chainIdOverride?: number) {
        const chainId = SwapService.resolveChainId(chainIdOverride)
        const chain = chainId === bscTestnet.id ? bscTestnet : bsc
        return { chainId, chain }
    }

    private static resolveAccount(defaultAddress?: string) {
        const accountState = getAccount(config)
        if (accountState.address) {
            return accountState.address as `0x${string}`
        }
        if (defaultAddress) {
            return defaultAddress as `0x${string}`
        }
        return undefined
    }

    static async getAmountOut(
        amountIn: string,
        tokenInAddress: string,
        tokenOutAddress: string
    ): Promise<string> {
        try {
            const amountInWei = parseUnits(amountIn, 18)
            const path = [tokenInAddress, tokenOutAddress] as `0x${string}`[]
            const { chainId, chain } = SwapService.getChainContext()

            console.log('Getting amounts out with params:', {
                amountInWei: amountInWei.toString(),
                path
            })

            const amounts = await readContract(config, {
                chainId,
                authorizationList: undefined,
                address: PANCAKESWAP_V2_ADDRESSES.ROUTER as `0x${string}`,
                abi: PANCAKESWAP_V2_ROUTER_ABI,
                functionName: 'getAmountsOut',
                args: [amountInWei, path],
            }) as bigint[]

            return formatUnits(amounts[1], 18)
        } catch (error) {
            console.error('Error getting amount out:', error)
            return '0'
        }
    }

    static async checkAllowance(
        tokenAddress: string,
        ownerAddress: string,
        spenderAddress: string = PANCAKESWAP_V2_ADDRESSES.ROUTER
    ): Promise<bigint> {
        try {
            const { chainId, chain } = SwapService.getChainContext()
            const account = SwapService.resolveAccount(ownerAddress)
            const allowance = await readContract(config, {
                chainId,
                authorizationList: undefined,
                ...(account ? { account } : {}),
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
            }) as bigint

            return allowance
        } catch (error) {
            console.error('Error checking allowance:', error)
            return BigInt(0)
        }
    }

    static async approveToken(
        tokenAddress: string,
        ownerAddress: string,
        amount?: string | bigint,
        spenderAddress: string = PANCAKESWAP_V2_ADDRESSES.ROUTER
    ): Promise<string> {
        try {
            // Prefer exact approvals. If amount is bigint, it's already in wei.
            // If no amount is provided, or amount === 'max', approve the full uint256 max (legacy behavior).
            const approveValue = typeof amount === 'bigint'
                ? amount
                : (amount == null || amount === 'max')
                    ? BigInt(MAX_UINT)
                    : parseUnits(amount, 18);
            const { chainId, chain } = SwapService.getChainContext()
            const account = SwapService.resolveAccount(ownerAddress)
            if (!account) {
                throw new Error('No connected account available for approval')
            }

            const hash = await writeContract(config, {
                chainId,
                chain,
                account,
                authorizationList: undefined,
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [spenderAddress as `0x${string}`, approveValue],
            })

            await waitForTransactionReceipt(config, { chainId, hash })
            return hash
        } catch (error) {
            console.error('Error approving token:', error)
            throw error
        }
    }

    static async swapTokens(
        amountIn: string,
        amountOutMin: string,
        tokenInAddress: string,
        tokenOutAddress: string,
        userAddress: string,
        slippageTolerance: number = 2
    ): Promise<string> {
        try {
            const amountInWei = parseUnits(amountIn, 18)
            const amountOutMinWei = parseUnits(amountOutMin, 18)
            const { chainId, chain } = SwapService.getChainContext()
            const account = SwapService.resolveAccount(userAddress)
            if (!account) {
                throw new Error('No connected account available for swap')
            }

            // Apply slippage tolerance
            const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100))
            const adjustedAmountOutMin = (amountOutMinWei * slippageMultiplier) / BigInt(10000)

            const path = [tokenInAddress, tokenOutAddress] as `0x${string}`[]
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20) // 20 minutes

            console.log('Swap parameters before contract call:', {
                amountInWei: amountInWei.toString(),
                adjustedAmountOutMin: adjustedAmountOutMin.toString(),
                path,
                userAddress,
                deadline: deadline.toString(),
                functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens'
            })

            const hash = await writeContract(config, {
                chainId,
                chain,
                account,
                authorizationList: undefined,
                address: PANCAKESWAP_V2_ADDRESSES.ROUTER as `0x${string}`,
                abi: PANCAKESWAP_V2_ROUTER_ABI,
                functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
                args: [
                    amountInWei,
                    adjustedAmountOutMin,
                    path,
                    userAddress as `0x${string}`,
                    deadline,
                ],
            })

            console.log('Swap transaction hash:', hash)
            await waitForTransactionReceipt(config, { chainId, hash })
            return hash
        } catch (error) {
            console.error('Error swapping tokens with fee-supporting function:', error)

            // Fallback to regular swap function
            try {
                console.log('Trying regular swapExactTokensForTokens as fallback...')

                const amountInWei = parseUnits(amountIn, 18)
                const amountOutMinWei = parseUnits(amountOutMin, 18)
                const { chainId, chain } = SwapService.getChainContext()
                const account = SwapService.resolveAccount(userAddress)
                if (!account) {
                    throw new Error('No connected account available for swap')
                }

                const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100))
                const adjustedAmountOutMin = (amountOutMinWei * slippageMultiplier) / BigInt(10000)

                const path = [tokenInAddress, tokenOutAddress] as `0x${string}`[]
                const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20)

                const hash = await writeContract(config, {
                    chainId,
                    chain,
                    account,
                    authorizationList: undefined,
                    address: PANCAKESWAP_V2_ADDRESSES.ROUTER as `0x${string}`,
                    abi: PANCAKESWAP_V2_ROUTER_ABI,
                    functionName: 'swapExactTokensForTokens',
                    args: [
                        amountInWei,
                        adjustedAmountOutMin,
                        path,
                        userAddress as `0x${string}`,
                        deadline,
                    ],
                })

                await waitForTransactionReceipt(config, { chainId, hash })
                return hash
            } catch (fallbackError) {
                console.error('Both swap functions failed:', fallbackError)
                throw fallbackError
            }
        }
    }
}