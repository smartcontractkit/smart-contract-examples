import { parseEther } from "ethers/lib/utils";
import { ethers, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    `Attempting to deploy EmojiNFT smart contract on Rinkeby network from ${deployer.address}`
  );

  const numberOfBlockConfiramtions = 6;
  /**
   * https://docs.chain.link/docs/vrf-contracts/#rinkeby
   *
   * Rinkeby Faucets
   *
   * Testnet LINK is available from https://faucets.chain.link/rinkeby
   * Testnet ETH is available from: https://faucets.chain.link/rinkeby
   * Backup Testnet ETH Faucets: https://rinkeby-faucet.com/, https://app.mycrypto.com/faucet
   */
  const linkAddress = `0x01BE23585060835E02B77ef475b0Cc51aA1e0709`;
  const vrfCoordinator = `0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B`;
  const keyHash = `0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311`;
  const fee = parseEther(`0.1`);

  const emojiNftFactory = await ethers.getContractFactory(`EmojiNFT`);
  const emojiNft = await emojiNftFactory.deploy(
    vrfCoordinator,
    linkAddress,
    keyHash,
    fee
  );

  await emojiNft.deployTransaction.wait(numberOfBlockConfiramtions);

  console.log(`EmojiNFT contract deployed to: ${emojiNft.address}`);

  // auto-fund
  const amount = `1`;
  console.log(`Attempting to auto-fund Emoji NFT contract with ${amount} LINK`);
  const linkContract = await ethers.getContractAt(`LinkToken`, linkAddress);

  await linkContract.transfer(emojiNft.address, parseEther(amount));

  console.log(`Emoji NFT successfully funded`);

  run("verify:verify", {
    address: emojiNft.address,
    constructorArguments: [vrfCoordinator, linkAddress, keyHash, fee],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
