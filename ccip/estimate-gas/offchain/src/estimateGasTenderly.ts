require("@chainlink/env-enc").config();
import axios from "axios";
import { getCCIPConfig } from "../ccip.config";
import { buildTransactionData } from "./helper";
import testData from "../data.json";

const simulateTransaction = async () => {
  const TENDERLY_ACCOUNT_SLUG = process.env.TENDERLY_ACCOUNT_SLUG;
  const TENDERLY_PROJECT_SLUG = process.env.TENDERLY_PROJECT_SLUG;
  const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY;
  const tenderlyApiUrl = `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}/simulate`;

  const ethereumSepoliaRouterAddress = getCCIPConfig("ethereumSepolia").router;
  const avalancheFujiChainSelector =
    getCCIPConfig("avalancheFuji").chainSelector;
  const sender = testData.avalancheFuji.sender;
  const receiver = testData.ethereumSepolia.receiver;

  const params = [
    0, // min
    50, // average
    99, // max
  ];

  const gasUsageReport = [];

  for (const iterations of params) {
    const txData = buildTransactionData(
      iterations,
      avalancheFujiChainSelector,
      sender
    );

    const { data } = await axios.post(
      tenderlyApiUrl,
      {
        // Simulation Configuration
        save: true,
        save_if_fails: false,
        estimate_gas: true,
        simulation_type: "quick",
        network_id: "11155111", // Sepolia
        // Standard EVM Transaction object (sample values)
        from: ethereumSepoliaRouterAddress,
        to: receiver,
        input: txData,
        gas: 8000000,
        gas_price: 0,
        value: 0,
      },
      {
        headers: {
          "X-Access-Key": TENDERLY_ACCESS_KEY,
        },
      }
    );
    const { gas_used } = data.transaction.transaction_info.call_trace;

    gasUsageReport.push({
      iterations,
      gasUsed: gas_used.toString(),
    });
  }

  console.log("Final Gas Usage Report:");
  gasUsageReport.forEach((report) => {
    console.log(
      "Number of iterations %d - Gas used: %d",
      report.iterations,
      report.gasUsed
    );
  });
};

simulateTransaction();
