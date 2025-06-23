import { task, types } from "hardhat/config";
import { Chains, networks, logger, getEVMNetworkConfig } from "../config";
import type { Faucet } from "../typechain-types";
import type { ContractFactory } from "ethers";

interface DeployFaucetTaskArgs {
  tokenaddress: string;
  initialdripamount: bigint;
  verifycontract: boolean;
}

// Task to deploy the Faucet contract
task("deployFaucet", "Deploys the Faucet contract")
  .addParam(
    "tokenaddress",
    "The address of the IBurnMintERC20 token the Faucet will manage",
    undefined,
    types.string
  )
  .addParam(
    "initialdripamount",
    "The initial amount of tokens the Faucet will dispense per drip",
    undefined,
    types.string // Use string to handle potentially large numbers, will be BigNumberish
  )
  .addOptionalParam(
    "verifycontract",
    "Verify the contract on Blockchain scan",
    false,
    types.boolean
  )
  .setAction(async (taskArgs: DeployFaucetTaskArgs, hre) => {
    const {
      tokenaddress: tokenAddress,
      initialdripamount: initialDripAmount, // This will be a string from task args
      verifycontract: verifyContract,
    } = taskArgs;

    const networkName = hre.network.name as Chains;

    // Check if network is defined in config
    if (!getEVMNetworkConfig(networkName)) {
      throw new Error(`Network ${networkName} not found in config`);
    }

    // Validate tokenAddress
    if (!hre.ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // The initialDripAmount comes as a string, ethers.js will handle it as BigNumberish
    logger.info(`Deploying Faucet contract to ${networkName}`);
    logger.info(`   Token Address: ${tokenAddress}`);
    logger.info(`   Initial Drip Amount: ${initialDripAmount.toString()}`);

    const signer = (await hre.ethers.getSigners())[0];
    const FaucetFactory: ContractFactory = await hre.ethers.getContractFactory(
      "Faucet",
      signer
    );

    let faucet: Faucet;

    try {
      faucet = (await FaucetFactory.deploy(
        tokenAddress,
        initialDripAmount // Pass as string, ethers handles BigNumberish
      )) as Faucet;

      const numberOfConfirmations =
        getEVMNetworkConfig(networkName)?.confirmations;
      if (numberOfConfirmations === undefined) {
        throw new Error(`confirmations is not defined for ${networkName}`);
      }

      logger.info(
        `Waiting ${numberOfConfirmations} blocks for transaction ${
          faucet.deploymentTransaction()?.hash
        } to be confirmed...`
      );
      await faucet.deploymentTransaction()?.wait(numberOfConfirmations);

      const faucetAddress = await faucet.getAddress();
      logger.info(`Faucet contract deployed to: ${faucetAddress}`);

      if (verifyContract) {
        logger.info("Verifying Faucet contract...");
        try {
          await hre.run("verify:verify", {
            address: faucetAddress,
            constructorArguments: [tokenAddress, initialDripAmount],
          });
          logger.info("Faucet contract deployed and verified");
        } catch (error) {
          if (error instanceof Error) {
            if (!error.message.includes("Already Verified")) {
              logger.error(`Verification error: ${error.message}`);
              logger.warn(
                "Faucet contract deployed but not verified. Ensure you are waiting for enough confirmation blocks"
              );
            } else {
              logger.warn("Faucet contract deployed but already verified");
            }
          } else {
            logger.error(
              "Faucet contract deployed but there was an unknown error while verifying"
            );
            logger.error(error);
          }
        }
      } else {
        logger.info("Faucet contract deployed successfully");
      }
    } catch (error) {
      logger.error(error);
      throw new Error("Faucet deployment failed");
    }
  });
