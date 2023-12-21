"use client"

import { DynamicWidget } from "../lib/dynamic"
import { useAccount, useNetwork } from "wagmi"

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

export default function Home() {
    return (
        <main className="flex flex-col items-center justify-between p-24">
            <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <DynamicWidget />
            </div>
            <WalletInfo />
        </main>
    )
}
