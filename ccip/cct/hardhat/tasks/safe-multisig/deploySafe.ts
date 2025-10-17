import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress, toHex } from "viem";
import { randomBytes } from "crypto";
import SafeDefault from "@safe-global/protocol-kit";
import { logger } from "../../config";

// Type assertion for Safe.init() which exists at runtime but not in types
const Safe = SafeDefault as any;

/**
 * Deploys a new Safe (Gnosis Safe) account.
 *
 * Example:
 * npx hardhat deploySafe \
 *   --owners 0xOwner1,0xOwner2,0xOwner3 \
 *   --threshold 2 \
 *   --network sepolia
 */
export const deploySafe = task("deploySafe", "Deploys a new Safe multisig contract")
  .addOption({
    name: "owners",
    description: "Comma-separated list of owner addresses",
    defaultValue: "",
  })
  .addOption({
    name: "threshold",
    description: "Number of required confirmations for a transaction",
    defaultValue: "1",
  })
  .setAction(async () => ({
    default: async (
      {
        owners,
        threshold: thresholdStr = "1",
      }: {
        owners: string;
        threshold?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!owners) {
        throw new Error("Owners are required (--owners), provide a comma-separated list of addresses");
      }

      // Parse threshold to number
      const threshold = parseInt(thresholdStr, 10);
      if (isNaN(threshold)) {
        throw new Error(`Invalid threshold value: ${thresholdStr}`);
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName;

      // ✅ Parse and validate owner addresses
      const ownerAddresses = owners.split(",").map((addr) => addr.trim());
      if (ownerAddresses.length === 0) {
        throw new Error("At least one owner address must be provided");
      }

      for (const addr of ownerAddresses) {
        if (!isAddress(addr)) {
          throw new Error(`Invalid Ethereum address: ${addr}`);
        }
      }

      if (threshold < 1 || threshold > ownerAddresses.length) {
        throw new Error(
          `Invalid threshold ${threshold}: must be between 1 and ${ownerAddresses.length}`
        );
      }

      // ✅ Load environment and RPC settings
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error("PRIVATE_KEY environment variable is missing");
      }

      // Get the RPC URL from the public client's chain configuration
      const publicClient = await viem.getPublicClient();
      const rpcUrl = publicClient.chain?.rpcUrls?.default?.http?.[0];
      
      if (!rpcUrl) {
        throw new Error(
          `RPC URL not found for network ${networkName}. ` +
          `Please ensure your hardhat.config.ts has a valid URL configured for this network.`
        );
      }

      try {
        logger.info(`⚙️  Deploying Safe multisig on ${networkName}...`);
        logger.info(`   Owners (${ownerAddresses.length}): ${ownerAddresses.join(", ")}`);
        logger.info(`   Threshold: ${threshold}`);

        // ✅ Initialize Safe with deployment configuration
        logger.info(`   Initializing Safe Protocol Kit...`);
        
        // Generate unique salt nonce for deterministic deployment
        const saltNonceBytes = randomBytes(32);
        const saltNonce = toHex(saltNonceBytes);
        
        logger.info(`   Salt nonce: ${saltNonce}`);
        logger.info(`   Deploying Safe contract...`);

        // ✅ Deploy the Safe using Safe.init() with predictedSafe configuration
        const protocolKit = await Safe.init({
          provider: rpcUrl,
          signer: privateKey,
          predictedSafe: {
            safeAccountConfig: {
              owners: ownerAddresses,
              threshold,
            },
            safeDeploymentConfig: {
              saltNonce,
            },
          },
        });

        const safeAddress = await protocolKit.getAddress();
        
        logger.info(`✅ Safe deployed successfully`);
        logger.info(`   Safe address: ${safeAddress}`);
        logger.info(`   Network: ${networkName}`);

      } catch (error) {
        logger.error("❌ Safe deployment failed:", error);
        throw error;
      }
    },
  }))
  .build();
