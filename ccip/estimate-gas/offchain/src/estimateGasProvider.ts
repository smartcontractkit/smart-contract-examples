require("@chainlink/env-enc").config();
import { ethers } from "ethers";
import { getCCIPConfig } from "../ccip.config";
import { buildTransactionData, estimateIntrinsicGas } from "./helper";
import testData from "../data.json";

async function estimateGas() {
  const ethereumSepoliaRouterAddress = getCCIPConfig("ethereumSepolia").router;
  const avalancheFujiChainSelector =
    getCCIPConfig("avalancheFuji").chainSelector;
  const sender = testData.avalancheFuji.sender;
  const receiver = testData.ethereumSepolia.receiver;

  const ETHEREUM_SEPOLIA_RPC_URL = process.env.ETHEREUM_SEPOLIA_RPC_URL;
  const provider = new ethers.JsonRpcProvider(ETHEREUM_SEPOLIA_RPC_URL);
  const params = [
    0, // min
    50, // average
    99, // max
  ];

  const gasUsageReport = [];

  for (const iterations of params) {
    const data = buildTransactionData(
      iterations,
      avalancheFujiChainSelector,
      sender
    );

    const estimatedGas = await provider.estimateGas({
      to: receiver,
      from: ethereumSepoliaRouterAddress,
      data: data,
    });

    const intrinsicGas = estimateIntrinsicGas(data);

    const ccipReceiveGas = estimatedGas - intrinsicGas;

    gasUsageReport.push({
      iterations,
      gasUsed: ccipReceiveGas.toString(),
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
}

estimateGas().catch(console.error);
