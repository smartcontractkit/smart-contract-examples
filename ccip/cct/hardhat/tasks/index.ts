import { deployToken } from "./deployToken";
import { deployTokenPool } from "./deployTokenPool";
import { mintTokens } from "./mintTokens";
import { checkTokenBalance } from "./checkTokenBalance";
import { claimAdmin } from "./claimAdmin";
import { acceptAdminRole } from "./acceptAdminRole";
import { transferTokenAdminRole } from "./transferTokenAdminRole";
import { getPoolConfig } from "./getPoolConfig";
import { setPool } from "./setPool";
import { applyChainUpdates } from "./applyChainUpdates";
import { transferTokens } from "./transferTokens";
import { updateAllowList } from "./updateAllowList";
import { getCurrentRateLimits } from "./getCurrentRateLimits";
import { updateRateLimiters } from "./updateRateLimiters";
import { setRateLimitAdmin } from "./setRateLimitAdmin";
import { addRemotePool } from "./addRemotePool";
import { removeRemotePool } from "./removeRemotePool";
import { safeMultisigTasks } from "./safe-multisig";
import {
  deployTokenSenderReceiver,
  sendTokens,
  estimateFee
} from "./native-gas-sender-receiver";

export const tasks = [
  deployToken,
  deployTokenPool,
  mintTokens,
  checkTokenBalance,
  claimAdmin,
  acceptAdminRole,
  transferTokenAdminRole,
  getPoolConfig,
  setPool,
  applyChainUpdates,
  transferTokens,
  updateAllowList,
  getCurrentRateLimits,
  updateRateLimiters,
  setRateLimitAdmin,
  addRemotePool,
  removeRemotePool,
  // Native Gas Sender Receiver tasks
  deployTokenSenderReceiver,
  sendTokens,
  estimateFee,
  ...safeMultisigTasks
];

export const npmFilesToBuild = [
  "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol",
  "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol",
  "@chainlink/contracts-ccip/contracts/pools/LockReleaseTokenPool.sol",
  "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol",
  "@chainlink/contracts-ccip/contracts/tokenAdminRegistry/RegistryModuleOwnerCustom.sol",
  "@chainlink/contracts-ccip/contracts/tokenAdminRegistry/TokenAdminRegistry.sol",
  "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol",
  "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol",
  "@chainlink/contracts-ccip/contracts/libraries/RateLimiter.sol",
  "@chainlink/contracts-ccip/contracts/libraries/Client.sol",
  "@chainlink/contracts-ccip/contracts/applications/EtherSenderReceiver.sol",
  "@openzeppelin/contracts/token/ERC20/ERC20.sol",
];
