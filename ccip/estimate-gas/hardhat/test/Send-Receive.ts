import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("Sender and Receiver", function () {
  const chainSelector = "16015286601757825753";

  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const Router = await ethers.getContractFactory("MockCCIPRouter");
    const Sender = await ethers.getContractFactory("Sender");
    const Receiver = await ethers.getContractFactory("Receiver");
    const BurnMintERC677 = await ethers.getContractFactory("BurnMintERC677");

    const router = await Router.deploy();
    const link = await BurnMintERC677.deploy(
      "ChainLink Token",
      "LINK",
      18,
      BigInt(1e27)
    );

    const sender = await Sender.deploy(router, link);
    const receiver = await Receiver.deploy(router);
    await sender.allowlistDestinationChain(chainSelector, true);

    await receiver.allowlistSourceChain(chainSelector, true);
    await receiver.allowlistSender(sender, true);

    return { owner, sender, receiver, router, link };
  }

  it("should CCIP message from sender to receiver", async function () {
    const { sender, receiver, router } = await loadFixture(deployFixture);
    const gasLimit = 400000;
    const testParams = [
      0, // min
      50, // average
      99, // max
    ];
    const gasUsageReport = [];
    for (const iterations of testParams) {
      await sender.sendMessagePayLINK(
        chainSelector,
        receiver,
        iterations,
        gasLimit
      );

      // check gas used
      const mockRouterEvents = await router.queryFilter(
        router.filters.MsgExecuted
      );
      const mockRouterEvent = mockRouterEvents[mockRouterEvents.length - 1]; // check last event
      const gasUsed = mockRouterEvent.args.gasUsed;

      gasUsageReport.push({
        iterations,
        gasUsed: gasUsed.toString(),
      });
    }

    // Output the final report
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
