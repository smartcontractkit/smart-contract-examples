import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { isAddress, zeroAddress } from "viem";
import {
  Chains,
  CCIPContractName,
  logger,
  getEVMNetworkConfig,
  validateNetworkName,
  configData,
} from "../config";

/**
 * Updates outbound/inbound/both rate limiters for a given remote chain.
 *
 * Example:
 * npx hardhat updateRateLimiters \
 *   --pooladdress 0xYourPool \
 *   --remotechain baseSepolia \
 *   --ratelimiter both \
 *   --outboundratelimitenabled true \
 *   --outboundratelimitcapacity 1000 \
 *   --outboundratelimitrate 10 \
 *   --inboundratelimitenabled true \
 *   --inboundratelimitcapacity 500 \
 *   --inboundratelimitrate 5 \
 *   --network sepolia
 */
export const updateRateLimiters = task("updateRateLimiters", "Update rate limiters for an existing chain")
  .addOption({
    name: "pooladdress",
    description: "The token pool address",
    defaultValue: "",
  })
  .addOption({
    name: "remotechain",
    description: "The remote chain name",
    defaultValue: "",
  })
  .addOption({
    name: "ratelimiter",
    description: "Which rate limiter to update: outbound, inbound, or both",
    defaultValue: "both",
  })
  .addOption({
    name: "outboundratelimitenabled",
    description: "Enable outbound rate limiter (true/false)",
    defaultValue: "false",
  })
  .addOption({
    name: "outboundratelimitcapacity",
    description: "Outbound rate limiter capacity",
    defaultValue: "0",
  })
  .addOption({
    name: "outboundratelimitrate",
    description: "Outbound rate limiter rate",
    defaultValue: "0",
  })
  .addOption({
    name: "inboundratelimitenabled",
    description: "Enable inbound rate limiter (true/false)",
    defaultValue: "false",
  })
  .addOption({
    name: "inboundratelimitcapacity",
    description: "Inbound rate limiter capacity",
    defaultValue: "0",
  })
  .addOption({
    name: "inboundratelimitrate",
    description: "Inbound rate limiter rate",
    defaultValue: "0",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress,
        remotechain,
        ratelimiter = "both",
        outboundratelimitenabled = "false",
        outboundratelimitcapacity = "0",
        outboundratelimitrate = "0",
        inboundratelimitenabled = "false",
        inboundratelimitcapacity = "0",
        inboundratelimitrate = "0",
      }: {
        pooladdress: string;
        remotechain: string;
        ratelimiter?: string;
        outboundratelimitenabled?: string;
        outboundratelimitcapacity?: string;
        outboundratelimitrate?: string;
        inboundratelimitenabled?: string;
        inboundratelimitcapacity?: string;
        inboundratelimitrate?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // Validate required parameters
      if (!pooladdress) {
        throw new Error("Pool address is required (--pooladdress)");
      }

      if (!remotechain) {
        throw new Error("Remote chain is required (--remotechain)");
      }

      // Validate rate limiter option
      if (!["outbound", "inbound", "both"].includes(ratelimiter)) {
        throw new Error("Rate limiter must be one of: outbound, inbound, both");
      }

      // Connect to network first
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = validateNetworkName(networkConnection.networkName);
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig) throw new Error(`Network ${networkName} not found`);
      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`confirmations missing for ${networkName}`);

      // ✅ Load remote chain config
      const remoteNetworkConfig = configData[remotechain as keyof typeof configData];
      if (!remoteNetworkConfig)
        throw new Error(`Remote chain ${remotechain} not found in config`);
      const remoteChainSelector = remoteNetworkConfig.chainSelector;
      if (remoteChainSelector === undefined)
        throw new Error(`chainSelector missing for ${remotechain}`);

      // ✅ Validate pool address
      if (!isAddress(pooladdress))
        throw new Error(`Invalid pool address: ${pooladdress}`);

      // Parse string parameters to proper types
      const outboundEnabled = outboundratelimitenabled === "true";
      const outboundCapacity = BigInt(outboundratelimitcapacity);
      const outboundRate = BigInt(outboundratelimitrate);
      const inboundEnabled = inboundratelimitenabled === "true";
      const inboundCapacity = BigInt(inboundratelimitcapacity);
      const inboundRate = BigInt(inboundratelimitrate);

      const remoteChainSelectorBigInt = BigInt(remoteChainSelector);

      const [wallet] = await viem.getWalletClients();
      const publicClient = await viem.getPublicClient();

      try {
        logger.info(`⚙️  Updating rate limiters for pool ${pooladdress} on ${networkName}...`);
        logger.info(`   Remote chain: ${remotechain}`);
        logger.info(`   Remote chain selector: ${remoteChainSelector}`);
        logger.info(`   Updating: ${ratelimiter === "both" ? "both limiters" : `${ratelimiter} limiter`}`);

        // ✅ Connect to TokenPool contract
        const pool = await viem.getContractAt(
          CCIPContractName.TokenPool,
          pooladdress as `0x${string}`
        );

        // ✅ Check if the remote chain is supported by this pool
        const isSupported = await pool.read.isSupportedChain([remoteChainSelectorBigInt]);
        if (!isSupported) {
          throw new Error(
            `Remote chain ${remotechain} (selector: ${remoteChainSelector}) is not supported by this pool.\n` +
            `Please add the chain first using the applyChainUpdates task.`
          );
        }
        logger.info(`   ✅ Remote chain is supported by the pool`);

        // ✅ Check if the caller is authorized (owner or rate limit admin)
        const [owner, rateLimitAdmin] = await Promise.all([
          pool.read.owner(),
          pool.read.getRateLimitAdmin(),
        ]);
        
        const callerAddress = wallet.account.address;
        const isOwner = callerAddress.toLowerCase() === owner.toLowerCase();
        const isRateLimitAdmin = rateLimitAdmin !== zeroAddress && 
                                 callerAddress.toLowerCase() === rateLimitAdmin.toLowerCase();

        if (!isOwner && !isRateLimitAdmin) {
          const rateLimitAdminDisplay = rateLimitAdmin === zeroAddress ? 'not set yet' : rateLimitAdmin;
          throw new Error(
            `Unauthorized: Caller ${callerAddress} is neither the owner (${owner}) nor the rate limit admin (${rateLimitAdminDisplay}).\n` +
            `Only the owner or rate limit admin can update rate limiters.`
          );
        }
        
        if (isOwner) {
          logger.info(`   ✅ Caller is the pool owner`);
        } else {
          logger.info(`   ✅ Caller is the rate limit admin`);
        }

        // ✅ Read current limiter states
        const [currentOutbound, currentInbound] = await Promise.all([
          pool.read.getCurrentOutboundRateLimiterState([remoteChainSelectorBigInt]),
          pool.read.getCurrentInboundRateLimiterState([remoteChainSelectorBigInt]),
        ]);

        logger.info(`\n📊 Current Rate Limiters for pool ${pooladdress}`);
        logger.info(
          `   Outbound → enabled=${currentOutbound.isEnabled}, cap=${currentOutbound.capacity.toString()}, rate=${currentOutbound.rate.toString()}`
        );
        logger.info(
          `   Inbound  → enabled=${currentInbound.isEnabled}, cap=${currentInbound.capacity.toString()}, rate=${currentInbound.rate.toString()}`
        );
        logger.info("\n========== Preparing Update ==========");

        // ✅ Build updated configs
        let outboundCfg = {
          isEnabled: currentOutbound.isEnabled,
          capacity: currentOutbound.capacity,
          rate: currentOutbound.rate,
        };
        if (ratelimiter === "outbound" || ratelimiter === "both") {
          outboundCfg = {
            isEnabled: outboundEnabled,
            capacity: outboundCapacity,
            rate: outboundRate,
          };
          logger.info(
            `   New Outbound → enabled=${outboundCfg.isEnabled}, cap=${outboundCfg.capacity}, rate=${outboundCfg.rate}`
          );
        }

        let inboundCfg = {
          isEnabled: currentInbound.isEnabled,
          capacity: currentInbound.capacity,
          rate: currentInbound.rate,
        };
        if (ratelimiter === "inbound" || ratelimiter === "both") {
          inboundCfg = {
            isEnabled: inboundEnabled,
            capacity: inboundCapacity,
            rate: inboundRate,
          };
          logger.info(
            `   New Inbound  → enabled=${inboundCfg.isEnabled}, cap=${inboundCfg.capacity}, rate=${inboundCfg.rate}`
          );
        }

        // ✅ Execute update
        logger.info(
          `\n⚡ Updating ${ratelimiter === "both" ? "both limiters" : `${ratelimiter} limiter(s)`}...`
        );

        const txHash = await pool.write.setChainRateLimiterConfig(
          [remoteChainSelectorBigInt, outboundCfg, inboundCfg],
          { account: wallet.account }
        );

        logger.info(`⏳ Rate limiter update tx: ${txHash}`);
        logger.info(`   Waiting for ${confirmations} confirmation(s)...`);
        await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          confirmations,
        });

        logger.info(`✅ Rate limiters updated successfully`);
        logger.info(`   Transaction: ${txHash}`);

      } catch (error) {
        logger.error("❌ Rate limiter update failed:", error);
        throw error;
      }
    },
  }))
  .build();
