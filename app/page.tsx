"use client"

import { DynamicWidget } from "../lib/dynamic"
import { useAccount, useNetwork, useToken } from "wagmi"

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

export default function Home() {
    return (
        <main className="flex flex-col items-center justify-between p-24">
            <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <DynamicWidget />
            </div>
            <WalletInfo />
            <TokenInfo />
        </main>
    )
}
