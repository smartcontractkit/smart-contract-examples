import { BigNumber, Contract, Wallet } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { LinkToken } from "../../typechain";

export const fundLink = async (
  vrfConsumer: Contract,
  linkToken: LinkToken,
  sender: Wallet
): Promise<void> => {
  const linkAmount: BigNumber = parseEther(`1`);

  await linkToken.connect(sender).transfer(vrfConsumer.address, linkAmount);
};
