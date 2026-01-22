import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { SwapService } from '@/service/swapService'
import { parseUnits } from 'viem'
import { toast } from 'react-hot-toast'

export function useTokenSwap() {
    const { address } = useAccount()
    const [isLoading, setIsLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)

    const addOnePercentBuffer = useCallback((amountWei: bigint) => {
        if (amountWei <= 0n) return 0n
        // ceil(amountWei * 1%) = ceil(amountWei / 100)
        const onePercent = (amountWei + 99n) / 100n
        return amountWei + onePercent
    }, [])

    const getQuote = useCallback(async (
        amountIn: string,
        tokenInAddress: string,
        tokenOutAddress: string
    ) => {
        if (!amountIn || parseFloat(amountIn) <= 0) return '0'

        try {
            const amountOut = await SwapService.getAmountOut(
                amountIn,
                tokenInAddress,
                tokenOutAddress
            )
            return amountOut
        } catch (error) {
            console.error('Error getting quote:', error)
            return '0'
        }
    }, [])

    const executeSwap = useCallback(async (
        amountIn: string,
        amountOutMin: string,
        tokenInAddress: string,
        tokenOutAddress: string,
        slippage: number = 0.5
    ) => {
        if (!address) {
            toast.error('Please connect your wallet')
            return null
        }

        setIsLoading(true)
        setTxHash(null)

        try {
            // Check allowance first
            const allowance = await SwapService.checkAllowance(tokenInAddress, address)
            const amountInWei = parseUnits(amountIn, 18)
            const approveTargetWei = addOnePercentBuffer(amountInWei)

            // Approve if needed
            if (allowance < approveTargetWei) {
                toast('Approving token spend...')
                // Approve only what we need (+1% buffer)
                await SwapService.approveToken(tokenInAddress, address, approveTargetWei)
                toast.success('Token approved successfully')
            }

            // Execute swap
            toast('Executing swap...')
            const hash = await SwapService.swapTokens(
                amountIn,
                amountOutMin,
                tokenInAddress,
                tokenOutAddress,
                address,
                slippage
            )

            setTxHash(hash)
            toast.success('Swap completed successfully!')
            return hash
        } catch (error: unknown) {
            console.error('Swap error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            toast.error(`Swap failed: ${errorMessage}`)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [address, addOnePercentBuffer])

    return {
        getQuote,
        executeSwap,
        isLoading,
        txHash,
    }
}