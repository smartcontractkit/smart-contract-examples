import { task } from "hardhat/config";
import Safe, { SafeFactory } from "@safe-global/protocol-kit";
import { logger } from "../../config";

/**
 * Deploys a new Safe (Gnosis Safe) account.
 *
 * Example:
 * npx hardhat deploySafe \
 *   --owners 0xOwner1,0xOwner2 \
 *   --threshold 2 \
 *   --network sepolia
 */
task("deploySafe", "Deploys a new Safe multisig contract")
  .setAction(<any>(async (taskArgs: { owners: string; threshold?: number }, hre: any) => {
    const { owners, threshold = 1 } = taskArgs;

    // ✅ Parse and validate owner addresses
    if (!owners)
      throw new Error(
        "Missing required argument: --owners (comma-separated list of addresses)"
      );

    const ownerAddresses = owners.split(",").map((addr) => addr.trim());
    if (ownerAddresses.length === 0)
      throw new Error("At least one owner address must be provided");

    for (const addr of ownerAddresses) {
      if (!hre.viem.isAddress(addr))
        throw new Error(`Invalid Ethereum address: ${addr}`);
    }

    if (threshold < 1 || threshold > ownerAddresses.length) {
      throw new Error(
        `Invalid threshold ${threshold}: must be between 1 and ${ownerAddresses.length}`
      );
    }

    // ✅ Load environment and RPC settings
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey)
      throw new Error("PRIVATE_KEY environment variable is missing");

    const netCfg = hre.config.networks[hre.network.name] as any;
    if (!netCfg?.url)
      throw new Error(`RPC URL not found for network ${hre.network.name}`);
    const rpcUrl = netCfg.url;

    logger.info("Initializing Safe Protocol Kit…");

    // ✅ Initialize Safe factory
    const safeFactory = await SafeFactory.init({
      provider: rpcUrl,
      signer: privateKey,
    });

    // ✅ Define Safe configuration
    const safeAccountConfig = {
      owners: ownerAddresses,
      threshold,
    };

    // ✅ Generate unique salt nonce for deterministic deployment
    const saltNonceBytes = hre.viem.randomBytes(32);
    const saltNonce = hre.viem.toHex(saltNonceBytes);

    logger.info("Deploying Safe with configuration:");
    logger.info(`  Owners: ${ownerAddresses.join(", ")}`);
    logger.info(`  Threshold: ${threshold}`);
    logger.info(`  Salt nonce: ${saltNonce}`);

    // ✅ Deploy the Safe
    try {
      const protocolKit = await safeFactory.deploySafe({
        safeAccountConfig,
        saltNonce,
      });

      const safeAddress = await protocolKit.getAddress();
      logger.info(`✅ Safe deployed successfully at: ${safeAddress}`);
    } catch (error) {
      logger.error("❌ Safe deployment failed:", error);
      throw error;
    }
  }));
