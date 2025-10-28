import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { SwapService } from '@/service/swapService'
import { parseUnits } from 'viem'
import { toast } from 'react-hot-toast'

export function useTokenSwap() {
    const { address } = useAccount()
    const [isLoading, setIsLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)

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

            // Approve if needed
            if (allowance < amountInWei) {
                toast('Approving token spend...')
                // Approve MAX to avoid repeated approvals
                await SwapService.approveToken(tokenInAddress, 'max')
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
    }, [address])

    return {
        getQuote,
        executeSwap,
        isLoading,
        txHash,
    }
}