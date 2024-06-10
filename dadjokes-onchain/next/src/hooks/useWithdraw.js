import { sepolia } from "viem/chains";

export function useWithdraw(dadJokesContract, walletClient, publicClient) {
  async function handleWithdraw() {
    // Instantiate a Wallet Client and a Public Client
    // const walletClient = await ConnectWalletClient();
    // Retrieve the wallet address using the Wallet Client
    const [address] = await walletClient.requestAddresses();
    await walletClient.switchChain({ id: sepolia.id });

    const { request } = await publicClient.simulateContract({
      address: dadJokesContract.address,
      abi: dadJokesContract.abi,
      functionName: "withdrawBalance",
      account: address,
    });
    await walletClient.writeContract(request);
  }
  return { handleWithdraw };
}
