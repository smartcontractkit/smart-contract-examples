import { ethers, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    `Attempting to deploy EmojiNFT smart contract on Rinkeby network from ${deployer.address}`
  );

  const numberOfBlockConfiramtions = 6;
  /**
   * https://docs.chain.link/docs/vrf-contracts/#rinkeby-testnet
   *
   * Rinkeby Faucets
   *
   * Testnet LINK is available from https://faucets.chain.link/rinkeby
   * Testnet ETH is available from: https://faucets.chain.link/rinkeby
   * Backup Testnet ETH Faucets: https://rinkeby-faucet.com/, https://app.mycrypto.com/faucet
   */
  const vrfCoordinator = `0x6168499c0cFfCaCD319c818142124B7A15E857ab`;
  const subscriptionId = process.env.SUBSCRIPTION_ID!;
  const keyHash = `0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc`;
  const callbackGasLimit = 1000000;
  const requestConfirmations = 3;

  const emojiNftFactory = await ethers.getContractFactory(`EmojiNFT`);
  const emojiNft = await emojiNftFactory.deploy(
    vrfCoordinator,
    keyHash,
    subscriptionId,
    callbackGasLimit,
    requestConfirmations
  );

  await emojiNft.deployTransaction.wait(numberOfBlockConfiramtions);

  console.log(`EmojiNFT contract deployed to: ${emojiNft.address}`);

  run("verify:verify", {
    address: emojiNft.address,
    constructorArguments: [
      vrfCoordinator,
      keyHash,
      subscriptionId,
      callbackGasLimit,
      requestConfirmations,
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
