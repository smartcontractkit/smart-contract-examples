import { ethers, run, network } from "hardhat";
import { SupportedNetworks, getCCIPConfig } from "../../ccip.config";
import { createOrUpdateConfigFile } from "../helper";

async function deployAndVerifyReceiver(network: SupportedNetworks) {
  const { router } = getCCIPConfig(network);

  console.log(`Deploying Receiver contract on ${network}...`);
  const Receiver = await ethers.getContractFactory("Receiver");
  const receiver = await Receiver.deploy(router);

  await receiver.waitForDeployment();
  const tx = receiver.deploymentTransaction();
  if (tx) {
    console.log("wait for 5 blocks");

    await tx.wait(5);

    const receiverAddress = await receiver.getAddress();

    console.log("Receiver contract deployed at:", receiverAddress);

    console.log(`Verifying Receiver contract on ${network}...`);
    try {
      await run("verify:verify", {
        address: receiverAddress,
        constructorArguments: [router],
      });
      console.log(`Receiver contract verified on ${network}!`);
    } catch (error) {
      console.error("Error verifying Receiver contract:", error);
    }

    await createOrUpdateConfigFile(network, { receiverAddress });
  }
}

deployAndVerifyReceiver(network.name as SupportedNetworks).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
