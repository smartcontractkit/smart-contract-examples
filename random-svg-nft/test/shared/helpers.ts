import { BigNumber, Wallet } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { VRFCoordinatorV2Mock } from "../../typechain";

export const createAndFundMockSubscription = async (
  vrfCoordinatorMock: VRFCoordinatorV2Mock,
  deployer: Wallet
): Promise<BigNumber> => {
  const tx = await vrfCoordinatorMock.connect(deployer).createSubscription();
  const txReceipt = await tx.wait();
  const subscriptionId = BigNumber.from(txReceipt.logs[0].topics[1]);
  await vrfCoordinatorMock.fundSubscription(subscriptionId, parseEther(`1`));

  return subscriptionId;
};
