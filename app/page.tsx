"use client"

import { DynamicWidget } from "../lib/dynamic"
import {
    Address,
    useAccount,
    useBalance,
    useContractWrite,
    useNetwork,
    usePrepareContractWrite,
    usePublicClient,
    useToken,
} from "wagmi"
import { ERC20Abi, getPermissionFromABI, ParamOperator, SessionKeyProvider } from "@zerodev/sdk"
import { LocalAccountSigner } from "@alchemy/aa-core"
import { generatePrivateKey } from "viem/accounts"
import { useDynamicContext } from "@dynamic-labs/sdk-react-core"
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa"
import { encodeFunctionData, zeroAddress } from "viem"
import { useState } from "react"

const testUsdcAddress = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
const myZeroDevWalletAddress = "0xfD7D4BFa21276acf6ceA29E041AbD8E1a887A6ae"
const toWalletAddress = "0xC13B7CDa9B08A4Fb1026E479A2079029cd30BfaD"
const usdcTransferAmount = 1_000000n
const usdcTransferCap = 100_000000n


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
        address: testUsdcAddress,
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
    const { data, isError, isLoading } = useBalance({
        address: myZeroDevWalletAddress,
        token: testUsdcAddress,
        watch: true,
    })

    if (isLoading) return <div>Fetching balance…</div>
    if (isError) return <div>Error fetching balance</div>
    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            Balance: {data?.formatted} {data?.symbol}
        </div>
    )
}

const SendToken = () => {
    const { config } = usePrepareContractWrite({
        address: testUsdcAddress,
        abi: ERC20Abi,
        functionName: "transfer",
        args: [toWalletAddress, usdcTransferAmount],
    })
    const { write } = useContractWrite(config)

    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <button className="border-2 p-2" disabled={!write} onClick={() => write?.()}>
                Send USDC
            </button>
        </div>
    )
}

const GenerateSessionKey = () => {
    const [serializedSessionKey, setSerializedSessionKey] = useState<string>()

    const { primaryWallet } = useDynamicContext()
    if (!primaryWallet) {
        return <div>No primary wallet</div>
    }
    const { connector } = primaryWallet
    if (!isZeroDevConnector(connector)) {
        return <div>Not a ZeroDevConnector</div>
    }
    const ecdsaProvider = connector.getAccountAbstractionProvider()
    if (!ecdsaProvider) {
        return <div>No ECDSA provider</div>
    }
    const generateSessionKey = async () => {
        const sessionPrivateKey = generatePrivateKey()
        const sessionKey = LocalAccountSigner.privateKeyToAccountSigner(sessionPrivateKey)
        const sessionKeyProvider = await SessionKeyProvider.init({
            // ZeroDev project ID
            projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!,
            // The master signer
            defaultProvider: ecdsaProvider,
            // the session key (private key)
            sessionKey,
            // session key parameters
            sessionKeyData: {
                // The UNIX timestamp at which the session key becomes valid
                validAfter: 0,
                // The UNIX timestamp at which the session key becomes invalid
                validUntil: 0,
                // The permissions
                // Each permission can be considered a "rule" for interacting with a particular
                // contract/function.  To create a key that can interact with multiple
                // contracts/functions, set up one permission for each.
                permissions: [
                    getPermissionFromABI({
                        // Target contract to interact with
                        target: testUsdcAddress,
                        // Maximum value that can be transferred.  In this case we
                        // set it to zero so that no value transfer is possible.
                        valueLimit: 0n,
                        // Contract abi
                        abi: ERC20Abi,
                        // Function name
                        functionName: "transfer",
                        // An array of conditions, each corresponding to an argument for
                        // the function.
                        args: [
                            {
                                // Argument operator and value.
                                operator: ParamOperator.EQUAL,
                                value: toWalletAddress,
                            },
                            {
                                // Argument operator and value.
                                operator: ParamOperator.LESS_THAN,
                                value: usdcTransferCap,
                            },
                        ],
                    }),
                ],
                // The "paymaster" param specifies whether the session key needs to
                // be used with a specific paymaster.
                // Without it, the holder of the session key can drain ETH from the
                // account by spamming transactions and wasting gas, so it's recommended
                // that you specify a trusted paymaster.
                //
                // address(0) means it's going to work with or without paymaster
                // address(1) works only with paymaster
                // address(paymaster) works only with the specified paymaster
                paymaster: zeroAddress,
            },
        })

        const serializedSessionKeyParams = await sessionKeyProvider.serializeSessionKeyParams(sessionPrivateKey)
        setSerializedSessionKey(serializedSessionKeyParams)
    }

    const sendToken = async () => {
        const start = Date.now()

        const sessionKeyParams = SessionKeyProvider.deserializeSessionKeyParams(serializedSessionKey!)
        const sessionKeyProvider = await SessionKeyProvider.fromSessionKeyParams({
            projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!,
            sessionKeyParams,
        })

        console.log(`deserialize: ${Date.now() - start}ms`)

        const { hash } = await sessionKeyProvider.sendUserOperation({
            target: testUsdcAddress,
            data: encodeFunctionData({
                abi: ERC20Abi,
                functionName: "transfer",
                args: [toWalletAddress, usdcTransferAmount],
            }),
        })

        console.log(`sendUserOperation: ${Date.now() - start}ms`)

        await sessionKeyProvider.waitForUserOperationTransaction(hash as Address)

        console.log(`waitForUserOperationTransaction: ${Date.now() - start}ms`)
    }

    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <p className="border-2 p-2">
                Session Key: <input className="w-full font-mono text-sm bg-gray-700" value={serializedSessionKey}
                                    onChange={(e) => setSerializedSessionKey(e.target.value)} />
            </p>
            <p>
                <button className="border-2 p-2" onClick={generateSessionKey}>
                    Generate Session Key
                </button>
            </p>
            <p>
                <button className="border-2 p-2" onClick={sendToken}>
                    Send Token by Session Key
                </button>
            </p>
        </div>
    )
}

const SignMessage = () => {
    const [unsignedMessage, setUnsignedMessage] = useState<string>()
    const [sig, setSig] = useState<string>()
    const [valid, setValid] = useState<boolean>(false)
    const publicClient = usePublicClient()

    const { primaryWallet } = useDynamicContext()
    if (!primaryWallet) {
        return <div>No primary wallet</div>
    }
    const { connector } = primaryWallet
    if (!isZeroDevConnector(connector)) {
        return <div>Not a ZeroDevConnector</div>
    }
    const ecdsaProvider = connector.getAccountAbstractionProvider()
    if (!ecdsaProvider) {
        return <div>No ECDSA provider</div>
    }

    const signMessage = async () => {
        let start = Date.now()

        const signature = await ecdsaProvider.signMessageWith6492(unsignedMessage || "")
        setSig(signature)

        console.log(`signMessage: ${Date.now() - start}ms`)
        start = Date.now()

        const valid = await publicClient.verifyMessage({
            address: primaryWallet.address as Address,
            message: unsignedMessage || "",
            signature,
        })
        setValid(valid)

        console.log(`verifyMessage: ${Date.now() - start}ms`)
    }

    return (
        <div className="p-6 max-w-5xl w-full items-center justify-between font-mono text-sm">
            <p className="border-2 p-2">
                Message: <input className="w-full font-mono text-sm bg-gray-700" value={unsignedMessage}
                                onChange={(e) => setUnsignedMessage(e.target.value)} />
            </p>
            <p className="border-2 p-2">
                Signature: <input className="w-full font-mono text-sm bg-gray-700" value={sig}
                                onChange={(e) => setSig(e.target.value)} />
            </p>
            <p className="border-2 p-2">
                Valid: {valid ? "true" : "false"}
            </p>
            <button className="border-2 p-2" onClick={signMessage}>
                Sign Message
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
            <GenerateSessionKey />
            <SignMessage />
        </main>
    )
}
