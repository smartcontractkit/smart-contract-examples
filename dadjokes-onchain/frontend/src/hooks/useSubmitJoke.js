import { useState } from "react";
import { sepolia } from "viem/chains";

export function useSubmitJoke(publicClient, walletClient, dadJokesContract) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (setup, punchline) => {
    // const walletClient = await ConnectWalletClient();
    // Retrieve the wallet address using the Wallet Client
    const [address] = await walletClient.requestAddresses();
    await walletClient.switchChain({ id: sepolia.id });

    const { request } = await publicClient.simulateContract({
      address: dadJokesContract.address,
      abi: dadJokesContract.abi,
      functionName: "addJoke",
      args: [setup, punchline],
      account: address,
    });
    await walletClient.writeContract(request);
    setIsModalOpen(false);
  };
  return { isModalOpen, setIsModalOpen, handleSubmit };
}
