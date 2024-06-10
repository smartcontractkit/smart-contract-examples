import { useState } from "react";
import { ConnectWalletClient } from "@/lib/client";
import { formatEther } from "viem";

export function useWallet(dadJokesContract) {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);

  async function handleClick() {
    try {
      const walletClient = await ConnectWalletClient();
      if (walletClient !== null) {
        const [address] = await walletClient.requestAddresses();
        setAddress(address);
        // Retrieve the balance of the address using the Public Client
        const balance = parseInt(
          await dadJokesContract.read.creatorBalances([address])
        );
        setAddress(address);
        setBalance(formatEther(BigInt(balance)));
      }
    } catch (error) {
      alert(`Transaction failed: ${error}`);
    }
  }

  return { address, balance, handleClick };
}
