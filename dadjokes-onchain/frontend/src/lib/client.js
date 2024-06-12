import { createWalletClient, createPublicClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import "viem/window";

export async function ConnectWalletClient() {
  // Check for window.ethereum
  // window.ethereum is an object provided by MetaMask or other web3 wallets
  let transport;
  if (typeof window !== "undefined" && window.ethereum) {
    // If window.ethereum exists, create a custom transport using it
    transport = custom(window.ethereum);
  } else {
    return null;
  }

  // Declare a Wallet Client
  // This creates a wallet client using the Sepolia chain and the custom transport
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: transport,
  });

  // Return the wallet client
  return walletClient;
}

export function ConnectPublicClient() {
  // Declare a Public Client
  // This creates a public client using the Sepolia chain and an HTTP transport
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http("https://rpc.sepolia.org"),
  });

  // Return the public client
  return publicClient;
}
