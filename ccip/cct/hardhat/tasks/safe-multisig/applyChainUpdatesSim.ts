import { task } from "hardhat/config";
import { logger } from "../../config";
import { TokenPool__factory } from "../../typechain-types";
import { ethers } from "ethers";

// Define the chain updates array at the file level
const chainUpdates = [
  {
    remoteChainSelector: BigInt("12532609583862916517"), // Example: Sepolia
    remotePoolAddresses: [
      "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Example pool address
      "0x1234567890123456789012345678901234567890", // Example pool address
    ].map((addr) => new ethers.AbiCoder().encode(["address"], [addr])),
    remoteTokenAddress: new ethers.AbiCoder().encode(
      ["address"],
      ["0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05"] // Example LINK token
    ),
    outboundRateLimiterConfig: {
      isEnabled: true,
      capacity: BigInt(1000000), // 1M tokens
      rate: BigInt(100000), // 100K tokens per second
    },
    inboundRateLimiterConfig: {
      isEnabled: true,
      capacity: BigInt(1000000), // 1M tokens
      rate: BigInt(100000), // 100K tokens per second
    },
  },
  // Add more chain updates here as needed
];

task(
  "simulateChainUpdates",
  "Simulate pool configuration without execution"
).setAction(async (_, hre) => {
  // Get the contract interface directly
  const poolInterface = TokenPool__factory.createInterface();

  // Encode the transaction data
  const setPoolData = poolInterface.encodeFunctionData(
    "applyChainUpdates",
    [[], chainUpdates] // Empty array for removals, our chainUpdates array for updates
  );

  // Log the encoded transaction data
  logger.info("Encoded transaction data for applyChainUpdates:");
  logger.info(setPoolData);
});
