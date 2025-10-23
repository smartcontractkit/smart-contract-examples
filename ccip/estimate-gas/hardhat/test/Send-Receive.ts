import { describe, it } from "node:test";
import hre from "hardhat";
import { parseEventLogs, getAddress } from "viem";

// Define a test suite for Sender and Receiver contracts.
describe("Sender and Receiver", function () {
  // Define a chain selector for the test scenario.
  const chainSelector = BigInt("16015286601757825753");

  // A fixture to deploy necessary contracts before each test.
  async function deployFixture() {
    const networkConnection = await hre.network.connect();
    const { viem } = networkConnection;
    const publicClient = await viem.getPublicClient();
    const [owner] = await viem.getWalletClients();

    // Deploy the contracts
    const routerArgs = Array<any>([]);
    const { contract: router } = await viem.sendDeploymentTransaction("MockCCIPRouter", ...routerArgs);
    
    const linkArgs = Array<any>([
      "ChainLink Token",
      "LINK",
      18,
      BigInt(1e27)
    ]);
    const { contract: link } = await viem.sendDeploymentTransaction(
      "BurnMintERC677",
      ...linkArgs
    );
    
    const senderArgs = Array<any>([
      router.address,
      link.address
    ]);
    const { contract: sender } = await viem.sendDeploymentTransaction(
      "Sender",
      ...senderArgs
    );
    
    const receiverArgs = Array<any>([
      router.address
    ]);
    const { contract: receiver } = await viem.sendDeploymentTransaction(
      "Receiver",
      ...receiverArgs
    );

    // Setup allowlists for chains and sender addresses for the test scenario.
    await sender.write.allowlistDestinationChain([chainSelector, true], {
      account: owner.account,
    });
    await receiver.write.allowlistSourceChain([chainSelector, true], {
      account: owner.account,
    });
    await receiver.write.allowlistSender([sender.address, true], {
      account: owner.account,
    });

    // Return the deployed instances and the owner for use in tests.
    return { owner, sender, receiver, router, link, publicClient };
  }

  // Test scenario to send a CCIP message from sender to receiver and assess gas usage.
  it("should CCIP message from sender to receiver", async function () {
    // Deploy contracts and load their instances.
    const networkConnection = await hre.network.connect();
    const { sender, receiver, router, owner, publicClient } = await networkConnection.networkHelpers.loadFixture(deployFixture);

    // Define parameters for the tests, including gas limit and iterations for messages.
    const gasLimit = 400000;
    const testParams = [0, 50, 99]; // Different iteration values for testing.
    const gasUsageReport: Array<{ iterations: number; gasUsed: string }> = []; // To store reports of gas used for each test.

    // Loop through each test parameter to send messages and record gas usage.
    for (const iterations of testParams) {
      await sender.write.sendMessagePayLINK(
        [chainSelector, receiver.address, BigInt(iterations), BigInt(gasLimit)],
        { account: owner.account }
      );

      // Retrieve gas used from the last message executed by querying the router's events.
      const msgExecutedEvents = await router.getEvents.MsgExecuted();
      const lastEvent = msgExecutedEvents[msgExecutedEvents.length - 1]; // check last event
      const gasUsed = (lastEvent.args as any).gasUsed as bigint;

      // Push the report of iterations and gas used to the array.
      gasUsageReport.push({
        iterations,
        gasUsed: gasUsed?.toString() || "0",
      });
    }

    // Log the final report of gas usage for each iteration.
    console.log("Final Gas Usage Report:");
    gasUsageReport.forEach((report) => {
      console.log(
        "Number of iterations %d - Gas used: %d",
        report.iterations,
        report.gasUsed
      );
    });
  });
});
