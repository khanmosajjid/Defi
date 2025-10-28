import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import type { WaitForTransactionReceiptParameters } from '@wagmi/core';
import type { Abi } from 'abitype';
import { config } from './wagmiConfig';

// Example helper showing how to call writeContract and wait for receipt using wagmi core
export async function writeAndWaitForReceipt(options: {
    abi: Abi | readonly unknown[];
    address: string;
    functionName: string;
    args?: unknown[];
}) {
    // writeContract uses the wagmi config from your app (exported in wagmiConfig)
    const res = await writeContract(config, {
        abi: options.abi as Abi,
        address: options.address,
        functionName: options.functionName,
        args: (options.args ?? []) as unknown as readonly unknown[],
    });

    console.log("res of transaction is ",res);

    // res should contain a hash when using typical providers
   

    // Wait for receipt
    const transactionReceipt = waitForTransactionReceipt(config, {
        hash: res,
    })
   

    return transactionReceipt;
}
