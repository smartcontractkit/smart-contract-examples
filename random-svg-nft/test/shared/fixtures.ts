import { Fixture } from "ethereum-waffle";
import { BigNumber, ContractFactory, Wallet } from "ethers";
import { ethers } from "hardhat";
import { EmojiNFT, VRFCoordinatorV2Mock } from "../../typechain";
import { createAndFundMockSubscription } from "./helpers";

type UnitEmojiNftFixtureType = {
  emojiNft: EmojiNFT;
  vrfCoordinatorMock: VRFCoordinatorV2Mock;
};

export const unitEmojiNftFixture: Fixture<UnitEmojiNftFixtureType> = async (
  signers: Wallet[]
) => {
  const deployer: Wallet = signers[0];
  const pointOneLink = BigNumber.from("100000000000000000");

  const vrfCoordinatorMockFactory: ContractFactory =
    await ethers.getContractFactory(`VRFCoordinatorV2Mock`);

  const vrfCoordinatorMock: VRFCoordinatorV2Mock =
    (await vrfCoordinatorMockFactory.connect(deployer).deploy(
      pointOneLink,
      1e9 // 0.000000001 LINK per gas
    )) as VRFCoordinatorV2Mock;

  await vrfCoordinatorMock.deployed();

  const subscriptionId = await createAndFundMockSubscription(
    vrfCoordinatorMock,
    deployer
  );

  const emojiNftFactory: ContractFactory = await ethers.getContractFactory(
    `EmojiNFT`
  );

  const keyHash: string = `0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc`;
  const callbackGasLimit: BigNumber = BigNumber.from(`1000000`);
  const requestConfirmations: BigNumber = BigNumber.from(`3`);

  const emojiNft: EmojiNFT = (await emojiNftFactory
    .connect(deployer)
    .deploy(
      vrfCoordinatorMock.address,
      keyHash,
      subscriptionId,
      callbackGasLimit,
      requestConfirmations
    )) as EmojiNFT;

  await emojiNft.deployed();

  return { emojiNft, vrfCoordinatorMock };
};
