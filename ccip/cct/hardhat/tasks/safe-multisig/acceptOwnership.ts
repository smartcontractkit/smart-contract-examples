import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { Chains, logger, getEVMNetworkConfig } from "../../config";
import {
  MetaTransactionData,
  SafeTransaction,
} from "@safe-global/safe-core-sdk-types";
import SafeDefault from "@safe-global/protocol-kit";
import { isAddress, encodeFunctionData, keccak256, toHex } from "viem";

/**
 * Accept ownership of a contract through a Gnosis Safe.
 *
 * Example:
 * npx hardhat acceptOwnershipFromSafe \
 *   --contractaddress 0xYourContract \
 *   --safeaddress 0xYourSafe \
 *   --network sepolia
 */
export const acceptOwnershipFromSafe = task(
  "acceptOwnershipFromSafe",
  "Accept ownership of a contract via a Safe multisig"
)
  .addOption({
    name: "contractaddress",
    description: "Address of the contract to accept ownership of",
    defaultValue: "",
  })
  .addOption({
    name: "safeaddress",
    description: "Address of the Safe multisig wallet",
    defaultValue: "",
  })
  .setAction(async () => ({
    default: async (
      {
        contractaddress = "",
        safeaddress = "",
      }: {
        contractaddress?: string;
        safeaddress?: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      // ⚙️ Validate required parameters
      if (!contractaddress) {
        throw new Error("❌ --contractaddress is required");
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

      // ⚙️ Validate addresses
      if (!isAddress(contractaddress))
        throw new Error(`❌ Invalid contract address: ${contractaddress}`);
      if (!isAddress(safeaddress))
        throw new Error(`❌ Invalid Safe address: ${safeaddress}`);

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
        `⚙️ Accepting ownership of contract ${contractaddress} via Safe ${safeaddress}`
      );

      // ⚙️ Validate contract exists
      const contractCode = await publicClient.getCode({
        address: contractaddress as `0x${string}`,
      });
      if (!contractCode || contractCode === "0x") {
        throw new Error(`❌ No contract found at ${contractaddress}`);
      }

      logger.info(`✅ Contract exists at ${contractaddress}`);

      // ⚙️ Check current owner and validate contract compatibility
      const ownableAbi = [
        {
          type: "function",
          name: "owner",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "address" }],
        },
      ] as const;

      try {
        const currentOwner = await publicClient.readContract({
          address: contractaddress as `0x${string}`,
          abi: ownableAbi,
          functionName: "owner",
        });

        logger.info(`⚙️ Current owner: ${currentOwner}`);

        // If Safe is already the owner, ownership has already been accepted
        if (currentOwner.toLowerCase() === safeaddress.toLowerCase()) {
          logger.info(`⚠️ Safe ${safeaddress} is already the owner of contract ${contractaddress}`);
          logger.info(`✅ No action needed - ownership has already been accepted`);
          return;
        }

        // Current owner is someone else - simulate acceptOwnership to verify transfer is pending
        logger.info(`✅ Current owner is ${currentOwner} - verifying ownership transfer to ${safeaddress}`);

        // ⚙️ Simulate acceptOwnership to verify it will succeed
        const acceptOwnershipAbi = [
          {
            type: "function",
            name: "acceptOwnership",
            stateMutability: "nonpayable",
            inputs: [],
            outputs: [],
          },
        ] as const;

        try {
          logger.info(`⚙️ Simulating acceptOwnership transaction...`);
          await publicClient.simulateContract({
            address: contractaddress as `0x${string}`,
            abi: acceptOwnershipAbi,
            functionName: "acceptOwnership",
            account: safeaddress as `0x${string}`,
          });
          logger.info(`✅ Simulation successful - Safe can accept ownership`);
        } catch (err: any) {
          const errorMessage = err.message || "";
          const shortMessage = err.shortMessage || "";
          
          // Calculate the error signature for MustBeProposedOwner()
          const mustBeProposedOwnerSignature = keccak256(toHex("MustBeProposedOwner()")).slice(0, 10);
          
          // Check if acceptOwnership function doesn't exist
          if (errorMessage.includes("does not exist") || 
              errorMessage.includes("is not a function") ||
              shortMessage.includes("does not exist") ||
              errorMessage.includes("Function \"acceptOwnership\" not found")) {
            throw new Error(
              `❌ Contract at ${contractaddress} does not implement acceptOwnership().\n` +
              `   \n` +
              `   The contract must implement the Ownable2Step pattern to accept ownership via Safe.\n` +
              `   \n` +
              `   Error: ${shortMessage || errorMessage}`
            );
          }
          
          // Check for the MustBeProposedOwner error by signature or text
          if (errorMessage.includes("MustBeProposedOwner") || 
              shortMessage.includes("MustBeProposedOwner") ||
              errorMessage.includes(mustBeProposedOwnerSignature) ||
              errorMessage.includes("0x02b543c6")) {
            throw new Error(
              `❌ Safe ${safeaddress} is not the pending owner of contract ${contractaddress}.\n` +
              `   \n` +
              `   The current owner must first call transferOwnership(${safeaddress}) before the Safe can accept.\n` +
              `   \n` +
              `   Error signature: ${mustBeProposedOwnerSignature} (MustBeProposedOwner)`
            );
          }
          
          // For any other simulation error, fail - don't proceed blindly
          throw new Error(
            `❌ Simulation of acceptOwnership failed.\n` +
            `   \n` +
            `   This could mean:\n` +
            `   - The contract does not implement the acceptOwnership() function\n` +
            `   - There is another issue preventing the transaction from succeeding\n` +
            `   \n` +
            `   Cannot proceed with Safe multisig transaction.\n` +
            `   \n` +
            `   Error: ${shortMessage || errorMessage}`
          );
        }
      } catch (err: any) {
        const ownerErrorMessage = err.message || "";
        const ownerShortMessage = err.shortMessage || "";
        
        // If owner() function doesn't exist, the contract is incompatible
        throw new Error(
          `❌ Contract at ${contractaddress} does not implement owner().\n` +
          `   \n` +
          `   The contract must implement the Ownable or Ownable2Step pattern.\n` +
          `   This task cannot be used with this contract.\n` +
          `   \n` +
          `   Error: ${ownerShortMessage || ownerErrorMessage}`
        );
      }

      // ⚙️ Encode acceptOwnership() call
      const acceptOwnershipAbi = [
        {
          type: "function",
          name: "acceptOwnership",
          stateMutability: "nonpayable",
          inputs: [],
          outputs: [],
        },
      ] as const;

      const encodedData = encodeFunctionData({
        abi: acceptOwnershipAbi,
        functionName: "acceptOwnership",
        args: [],
      });

      logger.info(`⚙️ Initializing Safe Protocol Kit for multisig transaction...`);

      // ⚙️ Initialize Safe instances for both signers
      const safe1 = await SafeDefault.init({
        provider: rpcUrl,
        signer: pk1,
        safeAddress: safeaddress,
      });
      const safe2 = await SafeDefault.init({
        provider: rpcUrl,
        signer: pk2,
        safeAddress: safeaddress,
      });

      const metaTx: MetaTransactionData = {
        to: contractaddress,
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
      logger.info("🚀 Executing Safe transaction to accept ownership...");
      let result: any;
      try {
        result = await safe1.executeTransaction(safeTx);
      } catch (err) {
        logger.error("❌ Execution failed:", err);
        throw err;
      }

      if (!result?.transactionResponse)
        throw new Error("❌ No transaction response from Safe execution");

      logger.info(
        `⏳ Waiting ${confirmations} blocks for tx ${result.hash} to confirm...`
      );
      await result.transactionResponse.wait(confirmations);

      logger.info(`✅ Ownership accepted successfully for ${contractaddress}`);
    },
  }))
  .build();
