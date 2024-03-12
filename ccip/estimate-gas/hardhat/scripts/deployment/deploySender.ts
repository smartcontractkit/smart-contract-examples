import { ethers, run, network } from "hardhat";
import fs from "fs";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

async function deployAndVerifySender(network: SupportedNetworks) {
  const { router, linkToken } = getCCIPConfig(network);

  console.log(`Deploying Sender contract on ${network}...`);
  const Sender = await ethers.getContractFactory("Sender");
  const sender = await Sender.deploy(router, linkToken);

  await sender.waitForDeployment();
  const tx = sender.deploymentTransaction();
  if (tx) {
    console.log("wait for 20 blocks");

    await tx.wait(20);

    const senderAddress = await sender.getAddress();

    console.log("Sender contract deployed at:", senderAddress);

    console.log(`Verifying Sender contract on ${network}...`);
    try {
      await run("verify:verify", {
        address: senderAddress,
        constructorArguments: [router, linkToken],
      });
      console.log(`Sender contract verified on ${network}!`);
    } catch (error) {
      console.error("Error verifying Sender contract:", error);
    }

    await createOrUpdateConfigFile(network, { senderAddress });
  }
}

deployAndVerifySender(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
