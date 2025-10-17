import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, TokenPoolContractName, logger, getEVMNetworkConfig, configData } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import SafeDefault from "@safe-global/protocol-kit";
import { isAddress, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from "viem";

const Safe = SafeDefault as any;

/**
 * Applies pool configuration updates through a Gnosis Safe.
 *
 * Example:
 * npx hardhat applyChainUpdatesFromSafe \
 *   --pooladdress 0xYourPool \
 *   --remotechain baseSepolia \
 *   --remotepooladdresses 0xRemotePool1,0xRemotePool2 \
 *   --remotetokenaddress 0xRemoteToken \
 *   --outboundratelimitenabled true \
 *   --outboundratelimitcapacity 1000 \
 *   --outboundratelimitrate 10 \
 *   --inboundratelimitenabled true \
 *   --inboundratelimitcapacity 500 \
 *   --inboundratelimitrate 5 \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
export const applyChainUpdatesFromSafe = task(
  "applyChainUpdatesFromSafe",
  "Configure a token pool via Safe multisig"
)
  .addOption({
    name: "pooladdress",
    description: "Address of the pool contract",
    defaultValue: "",
  })
  .addOption({
    name: "remotechain",
    description: "Remote chain name (e.g., baseSepolia)",
    defaultValue: "",
  })
  .addOption({
    name: "remotepooladdresses",
    description: "Comma-separated remote pool addresses",
    defaultValue: "",
  })
  .addOption({
    name: "remotetokenaddress",
    description: "Remote token address",
    defaultValue: "",
  })
  .addOption({
    name: "outboundratelimitenabled",
    description: "Enable outbound rate limiter (true/false)",
    defaultValue: "false",
  })
  .addOption({
    name: "outboundratelimitcapacity",
    description: "Outbound rate limit capacity",
    defaultValue: "0",
  })
  .addOption({
    name: "outboundratelimitrate",
    description: "Outbound rate limit rate",
    defaultValue: "0",
  })
  .addOption({
    name: "inboundratelimitenabled",
    description: "Enable inbound rate limiter (true/false)",
    defaultValue: "false",
  })
  .addOption({
    name: "inboundratelimitcapacity",
    description: "Inbound rate limit capacity",
    defaultValue: "0",
  })
  .addOption({
    name: "inboundratelimitrate",
    description: "Inbound rate limit rate",
    defaultValue: "0",
  })
  .addOption({
    name: "safeaddress",
    description: "Address of the Safe multisig wallet",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        pooladdress = "",
        remotechain = "",
        remotepooladdresses = "",
        remotetokenaddress = "",
        outboundratelimitenabled = "false",
        outboundratelimitcapacity = "0",
        outboundratelimitrate = "0",
        inboundratelimitenabled = "false",
        inboundratelimitcapacity = "0",
        inboundratelimitrate = "0",
        safeaddress = "",
      }: {
        pooladdress?: string;
        remotechain?: string;
        remotepooladdresses?: string;
        remotetokenaddress?: string;
        outboundratelimitenabled?: string;
        outboundratelimitcapacity?: string;
        outboundratelimitrate?: string;
        inboundratelimitenabled?: string;
        inboundratelimitcapacity?: string;
        inboundratelimitrate?: string;
        safeaddress?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // ⚙️ Validate required parameters
      if (!pooladdress) {
        throw new Error("❌ --pooladdress is required");
      }

      if (!remotechain) {
        throw new Error("❌ --remotechain is required");
      }

      if (!remotepooladdresses) {
        throw new Error("❌ --remotepooladdresses is required");
      }

      if (!remotetokenaddress) {
        throw new Error("❌ --remotetokenaddress is required");
      }

      if (!safeaddress) {
        throw new Error("❌ --safeaddress is required");
      }

      // ⚙️ Connect to network and get viem client
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const networkName = networkConnection.networkName as Chains;
      const publicClient = await viem.getPublicClient();

      // ⚙️ Validate network config
      const networkConfig = getEVMNetworkConfig(networkName);
      if (!networkConfig)
        throw new Error(`❌ Network ${networkName} not found in config`);

      const { confirmations } = networkConfig;
      if (confirmations === undefined)
        throw new Error(`❌ confirmations not defined for ${networkName}`);

      // ⚙️ Validate remote chain config
      const remoteConfig = configData[remotechain as keyof typeof configData];
      if (!remoteConfig)
        throw new Error(`❌ Remote chain ${remotechain} not found in config`);

      const remoteSelector = remoteConfig.chainSelector;
      if (!remoteSelector)
        throw new Error(`❌ chainSelector missing for ${remotechain}`);

      // ⚙️ Validate addresses
      if (!isAddress(pooladdress))
        throw new Error(`❌ Invalid pool address: ${pooladdress}`);
      if (!isAddress(remotetokenaddress))
        throw new Error(`❌ Invalid remote token address: ${remotetokenaddress}`);
      if (!isAddress(safeaddress))
        throw new Error(`❌ Invalid Safe address: ${safeaddress}`);

      const remotePools = remotepooladdresses
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      for (const addr of remotePools) {
        if (!isAddress(addr))
          throw new Error(`❌ Invalid remote pool address: ${addr}`);
      }

      // ⚙️ Environment variables for Safe signers
      const pk1 = process.env.PRIVATE_KEY;
      const pk2 = process.env.PRIVATE_KEY_2;
      if (!pk1 || !pk2)
        throw new Error("❌ Both PRIVATE_KEY and PRIVATE_KEY_2 must be set");

      // ⚙️ Extract RPC URL for Safe Protocol Kit
      const rpcUrl = publicClient.chain.rpcUrls.default.http[0];
      if (!rpcUrl)
        throw new Error(`❌ RPC URL not found for ${networkName}`);

      logger.info(
        `⚙️ Applying chain updates for pool ${pooladdress} → remote chain ${remotechain}`
      );

      // ⚙️ Get pool contract interface
      const pool = await viem.getContractAt(
        TokenPoolContractName.BurnMintTokenPool,
        pooladdress as `0x${string}`
      );

      // ⚙️ Check if Safe is the owner of the pool
      const poolOwner = await (pool as any).read.owner();
      if (poolOwner.toLowerCase() !== safeaddress.toLowerCase()) {
        throw new Error(
          `❌ Safe ${safeaddress} is not the owner of pool ${pooladdress}.\n` +
          `   Current owner: ${poolOwner}\n` +
          `   \n` +
          `   The Safe must be the pool owner to apply chain updates.\n` +
          `   \n` +
          `   If ownership of the pool has already been transferred to the Safe,\n` +
          `   please accept it first by running:\n` +
          `   npx hardhat acceptOwnershipFromSafe --contractaddress ${pooladdress} --safeaddress ${safeaddress} --network ${networkName}`
        );
      }

      // ⚙️ Build ChainUpdate struct
      const chainUpdate = {
        remoteChainSelector: BigInt(remoteSelector),
        remotePoolAddresses: remotePools.map((addr) =>
          encodeAbiParameters(parseAbiParameters("address"), [addr as `0x${string}`])
        ),
        remoteTokenAddress: encodeAbiParameters(
          parseAbiParameters("address"),
          [remotetokenaddress as `0x${string}`]
        ),
        outboundRateLimiterConfig: {
          isEnabled: outboundratelimitenabled === "true",
          capacity: BigInt(outboundratelimitcapacity),
          rate: BigInt(outboundratelimitrate),
        },
        inboundRateLimiterConfig: {
          isEnabled: inboundratelimitenabled === "true",
          capacity: BigInt(inboundratelimitcapacity),
          rate: BigInt(inboundratelimitrate),
        },
      };

      // ⚙️ Encode applyChainUpdates() call
      const encodedData = encodeFunctionData({
        abi: (pool as any).abi,
        functionName: "applyChainUpdates",
        args: [[], [chainUpdate]],
      });

      logger.info(`⚙️ Initializing Safe Protocol Kit for multisig transaction...`);

      // ⚙️ Initialize Safe instances for both signers
      const safe1 = await Safe.init({
        provider: rpcUrl,
        signer: pk1,
        safeAddress: safeaddress,
      });
      const safe2 = await Safe.init({
        provider: rpcUrl,
        signer: pk2,
        safeAddress: safeaddress,
      });

      const metaTx: MetaTransactionData = {
        to: pooladdress,
        data: encodedData,
        value: "0",
      };

      // ⚙️ Create Safe transaction
      let safeTx: SafeTransaction;
      try {
        safeTx = await safe1.createTransaction({ transactions: [metaTx] });
        logger.info("✅ Safe transaction created");
      } catch (err) {
        logger.error("❌ Failed to create Safe transaction", err);
        throw err;
      }

      // ⚙️ Sign by both owners
      try {
        safeTx = await safe1.signTransaction(safeTx);
        logger.info("✅ Signed by owner 1");
        safeTx = await safe2.signTransaction(safeTx);
        logger.info("✅ Signed by owner 2");
        logger.info(`✅ Transaction has ${safeTx.signatures.size} signature(s)`);
      } catch (err) {
        logger.error("❌ Error signing Safe transaction", err);
        throw err;
      }

      // ⚙️ Execute Safe transaction
      logger.info(`🚀 Executing Safe transaction for pool ${pooladdress}...`);
      let result: any;
      try {
        result = await safe1.executeTransaction(safeTx);
      } catch (err) {
        logger.error("❌ Safe execution failed", err);
        throw err;
      }

      if (!result?.transactionResponse)
        throw new Error("❌ No transaction response available");

      logger.info(
        `⏳ Waiting ${confirmations} blocks for tx ${result.hash} confirmation...`
      );
      await (result.transactionResponse as any).wait(confirmations);

      logger.info(`✅ Pool configured successfully for ${remotechain}`);
    },
  }))
  .build();
