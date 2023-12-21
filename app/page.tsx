"use client"

import { DynamicWidget } from "../lib/dynamic"
import { useAccount, useContractRead, useContractWrite, useNetwork, usePrepareContractWrite, useToken } from "wagmi"
import { ERC20Abi } from "@zerodev/sdk"

const WalletInfo = () => {
    const { address, isConnected } = useAccount()
    const { chain } = useNetwork()

    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <p>
                wagmi connected: {isConnected ? "true" : "false"}
            </p>
            <p>wagmi address: {address}</p>
            <p>wagmi network: {chain?.id}</p>
        </div>
    )
}

const TokenInfo = () => {
    const { data, isError, isLoading } = useToken({
        address: "0xe5e0DE0ABfEc2FFFaC167121E51d7D8f57C8D9bC",
    })

    if (isLoading) return <div>Fetching token…</div>
    if (isError) return <div>Error fetching token</div>

    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <p>
                Token: {data?.symbol}
            </p>
            <p>Token name: {data?.name}</p>
            <p>Decimals: {data?.decimals}</p>
        </div>
    )
}

const TokenBalance = () => {
    const contractRead = useContractRead({
        address: "0xe5e0DE0ABfEc2FFFaC167121E51d7D8f57C8D9bC",
        abi: ERC20Abi,
        functionName: "balanceOf",
        args: ["0x15C3E27F9967b5244E1DCB16a0ad9d9036aaA568"],
    })
    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <p>
                Balance: {contractRead.data?.toString()}
            </p>
        </div>
    )
}

const SendToken = () => {
    const {config } = usePrepareContractWrite({
        address: "0xe5e0DE0ABfEc2FFFaC167121E51d7D8f57C8D9bC",
        abi: ERC20Abi,
        functionName: 'transfer',
        args: ["0xC13B7CDa9B08A4Fb1026E479A2079029cd30BfaD", 100_000000n],
    })
    const { write } = useContractWrite(config)

    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <button className="border-2 p-2" disabled={!write} onClick={() => write?.()}>
                Send 100 USDC
            </button>
        </div>
    )
}

export default function Home() {
    return (
        <main className="flex flex-col items-center justify-between p-24">
            <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <DynamicWidget />
            </div>
            <WalletInfo />
            <TokenInfo />
            <TokenBalance />
            <SendToken />
        </main>
    )
}
