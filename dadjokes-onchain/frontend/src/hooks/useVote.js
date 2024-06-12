import { sepolia } from "viem/chains";
import { parseEther } from "viem/utils";

export function useVote(dadJokesContract, walletClient, publicClient) {
  async function handleVote(index, type) {
    const reward = type + 1;
    // Instantiate a Wallet Client and a Public Client
    // const walletClient = await ConnectWalletClient();
    // Retrieve the wallet address using the Wallet Client
    const [address] = await walletClient.requestAddresses();
    await walletClient.switchChain({ id: sepolia.id });

    let rewardAmount;

    switch (type) {
      case 0:
        rewardAmount = parseEther("0.001");
        break;
      case 1:
        rewardAmount = parseEther("0.005");
        break;
      case 2:
        rewardAmount = parseEther("0.01");
        break;
      default:
        throw new Error("Invalid reward type");
    }
    // Simulate the contract call to rewardJoke with the specified index and reward
    //   this will return a request object that can be used to write the contract.
    const { request } = await publicClient.simulateContract({
      address: dadJokesContract.address,
      abi: dadJokesContract.abi,
      functionName: "rewardJoke",
      args: [index, reward],
      account: address,
      value: rewardAmount,
    });
    await walletClient.writeContract(request);
    console.log(request);
  }
  return { handleVote };
}
