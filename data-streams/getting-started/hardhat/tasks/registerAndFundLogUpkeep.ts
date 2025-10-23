import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { parseEther, encodeAbiParameters, parseAbiParameters, keccak256, toHex, zeroHash } from "viem";
import { spin } from "./utils/index.js";

/**
 * Defines a Hardhat task to register an upkeep with Chainlink Automation.
 * This task sets up the necessary parameters for upkeep registration, including
 * trigger configuration for a LogEmitter contract, and submits the registration
 * request to a specified StreamsUpkeep contract.
 */
export const registerUpkeep = task(
  "registerAndFundUpkeep",
  "Registers and funds an upkeep with Chainlink Automation"
)
  .addOption({
    name: "streamsUpkeep",
    description: "The address of the deployed StreamsUpkeep contract",
    defaultValue: "",
  })
  .addOption({
    name: "logEmitter",
    description: "The address of the deployed LogEmitter contract",
    defaultValue: "",
  })
  .addOption({
    name: "name",
    description: "Name of the upkeep registration",
    defaultValue: "Prog. Streams Upkeep",
  })
  .addOption({
    name: "encryptedEmail",
    description: "Encrypted email (optional)",
    defaultValue: "0x",
  })
  .addOption({
    name: "gasLimit",
    description: "Maximum gas allowance for the upkeep execution",
    defaultValue: "500000",
  })
  .addOption({
    name: "triggerType",
    description: "Type of trigger (1 for Log Trigger)",
    defaultValue: "1",
  })
  .addOption({
    name: "checkData",
    description: "Data passed to checkUpkeep",
    defaultValue: "0x",
  })
  .addOption({
    name: "offchainConfig",
    description: "Off-chain configuration data",
    defaultValue: "0x",
  })
  .addOption({
    name: "amount",
    description: "Funding amount in LINK tokens (in ether units)",
    defaultValue: "1",
  })
  .addOption({
    name: "eventSig",
    description:
      "Event signature to trigger on (e.g., 'Log(address)'). Find this in your contract's events. Format: EventName(type1,type2,...) without parameter names or 'indexed' keyword",
    defaultValue: "Log(address)",
  })
  .setAction(async () => ({
    default: async (
      {
        streamsUpkeep,
        logEmitter,
        name,
        encryptedEmail,
        gasLimit,
        triggerType,
        checkData,
        offchainConfig,
        amount,
        eventSig,
      }: {
        streamsUpkeep: string;
        logEmitter: string;
        name: string;
        encryptedEmail: string;
        gasLimit: string;
        triggerType: string;
        checkData: string;
        offchainConfig: string;
        amount: string;
        eventSig: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {

      // Connect to network and get viem client
      const networkConnection = await hre.network.connect();
      const { viem } = networkConnection;
      const [walletClient] = await viem.getWalletClients();

      // Retrieve the deployer's (admin's) signer object to sign transactions.
      const admin = walletClient.account.address;

      // Parse task arguments
      // See more information on https://docs.chain.link/chainlink-automation/guides/register-upkeep-in-contract.
      const parsedGasLimit = parseInt(gasLimit);
      const parsedTriggerType = parseInt(triggerType);
      const parsedAmount = parseEther(amount);

      // Generate event signature hash from the event signature string
      const topic0 = keccak256(toHex(eventSig)); // Event signature hash computed from eventSig parameter
      const topic1 = zeroHash; // Placeholder topics (match any value for indexed parameters)
      const topic2 = zeroHash;
      const topic3 = zeroHash;

      console.log(topic1)

      // ABI-encode the trigger configuration data.
      const triggerConfig = encodeAbiParameters(
        parseAbiParameters(
          "address, uint8, bytes32, bytes32, bytes32, bytes32"
        ),
        [logEmitter as `0x${string}`, 0, topic0, topic1, topic2, topic3]
      );

      // Construct the parameters for registration, combining all previously defined values.
      const params = {
        name,
        encryptedEmail: encryptedEmail as `0x${string}`,
        upkeepContract: streamsUpkeep as `0x${string}`,
        gasLimit: parsedGasLimit,
        adminAddress: admin,
        triggerType: parsedTriggerType,
        checkData: checkData as `0x${string}`,
        triggerConfig,
        offchainConfig: offchainConfig as `0x${string}`,
        amount: parsedAmount,
      };

      const spinner = spin();
      // Interact with the deployed StreamsUpkeep contract to register the upkeep.
      spinner.start(
        `Registering upkeep with Chainlink Automation using account: ${admin}`
      );
      const StreamsUpkeepContract = await viem.getContractAt(
        "StreamsUpkeepRegistrar",
        streamsUpkeep as `0x${string}`
      );

      try {
        // Simulate the transaction first to catch any errors before sending
        await StreamsUpkeepContract.simulate.registerAndPredictID([params]);

        // If simulation succeeds, execute the actual transaction
        await StreamsUpkeepContract.write.registerAndPredictID([params]);
        spinner.succeed(
          `Upkeep registered and funded with ${amount} LINK successfully.`
        );
      } catch (error: any) {
        spinner.fail("Failed to register upkeep.");

        // Check if the error is related to auto-approve being disabled
        const errorMessage = error.message || "";
        const errorCause = error.cause?.reason || error.cause?.message || "";

        if (
          errorMessage.includes("auto-approve disabled") ||
          errorCause.includes("auto-approve disabled")
        ) {
          console.error(
            "\n❌ Auto-approve is disabled. If you would like to get your contract (i.e., StreamsUpkeepRegistrar in this case) whitelisted for using Log Triggers Automation, please fill the form at https://chainlinkcommunity.typeform.com/to/m10dC36d.\n"
          );
          return;
        }

        throw error;
      }
    },
  }))
  .build();
