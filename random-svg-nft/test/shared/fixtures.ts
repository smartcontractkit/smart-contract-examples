import { Fixture } from "ethereum-waffle";
import { BigNumber, ContractFactory, Wallet } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { EmojiNFT, LinkToken, VRFCoordinatorMock } from "../../typechain";
import { fundLink } from "./helpers";

type UnitEmojiNftFixtureType = {
  emojiNft: EmojiNFT;
  vrfCoordinatorMock: VRFCoordinatorMock;
  linkToken: LinkToken;
};

export const unitEmojiNftFixture: Fixture<UnitEmojiNftFixtureType> = async (
  signers: Wallet[]
) => {
  const deployer: Wallet = signers[0];

  const linkTokenFactory: ContractFactory = await ethers.getContractFactory(
    `LinkToken`
  );

  const linkToken: LinkToken = (await linkTokenFactory
    .connect(deployer)
    .deploy()) as LinkToken;

  await linkToken.deployed();

  const vrfCoordinatorMockFactory: ContractFactory =
    await ethers.getContractFactory(`VRFCoordinatorMock`);

  const vrfCoordinatorMock: VRFCoordinatorMock =
    (await vrfCoordinatorMockFactory
      .connect(deployer)
      .deploy(linkToken.address)) as VRFCoordinatorMock;

  await vrfCoordinatorMock.deployed();

  const emojiNftFactory: ContractFactory = await ethers.getContractFactory(
    `EmojiNFT`
  );

  const keyHash: string = `0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4`;
  const fee: BigNumber = parseEther(`0.1`);

  const emojiNft: EmojiNFT = (await emojiNftFactory
    .connect(deployer)
    .deploy(
      vrfCoordinatorMock.address,
      linkToken.address,
      keyHash,
      fee
    )) as EmojiNFT;

  await emojiNft.deployed();

  await fundLink(emojiNft, linkToken, deployer);

  return { emojiNft, vrfCoordinatorMock, linkToken };
};
