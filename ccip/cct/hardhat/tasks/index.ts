import { deployToken } from "./deployToken";
import { deployTokenPool } from "./deployTokenPool";
import { mintTokens } from "./mintTokens";
import {claimAdmin} from "./claimAdmin";
import {acceptAdminRole} from "./acceptAdminRole";
import { transferTokenAdminRole } from "./transferTokenAdminRole";
import { getPoolConfig } from "./getPoolConfig";
import { setPool } from "./setPool";
import { applyChainUpdates } from "./applyChainUpdates";
import {transferTokens} from "./transferTokens";
import { updateAllowList } from "./updateAllowList";
import { getCurrentRateLimits } from "./getCurrentRateLimits";
import { updateRateLimiters } from "./updateRateLimiters";
import { setRateLimitAdmin } from "./setRateLimitAdmin";
import { addRemotePool } from "./addRemotePool";
import { removeRemotePool } from "./removeRemotePool";
import { safeMultisigTasks } from "./safe-multisig";

export const tasks = [
    deployToken, 
    deployTokenPool, 
    mintTokens, 
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
];

console.log("✅ Tasks loaded from /tasks/index.ts");