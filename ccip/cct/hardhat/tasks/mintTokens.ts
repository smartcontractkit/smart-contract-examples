import { task } from "hardhat/config";
import { Chains, networks, logger } from "../config";

interface MintTokensArgs {
  tokenaddress: string;
  amount: string;
  receiveraddress: string;
}

// Task to mint tokens for a specific receiver, defaults to the signer's address if not provided
task("mintTokens", "Mint tokens for receiver")
  .addParam("tokenaddress", "The address of the token") // The token address for minting
  .addParam("amount", "The amount to mint") // The amount of tokens to mint (in wei)
  .addOptionalParam("receiveraddress", "The receiver of the minted tokens") // The receiver's address (defaults to the signer's address)
  .setAction(async (taskArgs: MintTokensArgs, hre) => {
    const {
      tokenaddress: tokenAddress,
      amount,
      receiveraddress: receiverAddress,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Retrieve the network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Get the signer (used to mint tokens)
    const signer = (await hre.ethers.getSigners())[0];

    // Set the receiver address to the provided value or default to the signer's address
    const to = receiverAddress || signer.address;

    // Validate the receiver's address
    if (!hre.ethers.isAddress(to)) {
      throw new Error(`Invalid receiver address: ${to}`);
    }

    // Load the BurnMintERC677 contract factory
    const { BurnMintERC677__factory } = await import("../typechain-types");

    // Connect to the token contract
    const tokenContract = BurnMintERC677__factory.connect(tokenAddress, signer);

    // Log the minting action
    logger.info(
      `Minting ${amount} of ${await tokenContract.symbol()} tokens to ${to}`
    );

    // Call the mint function to mint the tokens to the receiver
    const tx = await tokenContract.mint(to, amount);

    // Retrieve the number of confirmations required from the network config
    const { confirmations } = networkConfig;
    if (confirmations === undefined) {
      throw new Error(`confirmations is not defined for ${networkName}`);
    }

    // Wait for the transaction to be confirmed
    await tx.wait(confirmations);

    // Log the transaction hash and the current balance of the receiver
    logger.info(
      `Minted ${amount} of ${await tokenContract.symbol()} tokens to ${to} - transaction hash: ${
        tx.hash
      }`
    );
    logger.info(
      `Current balance of ${to} is ${await tokenContract.balanceOf(
        to
      )} ${await tokenContract.symbol()}`
    );
  });
