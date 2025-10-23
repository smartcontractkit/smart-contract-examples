import { deploySafe } from "./deploySafe";
import { deployTokenWithSafe } from "./deployToken";
import { grantMintBurnRoleFromSafe } from "./grantMintBurnRole";
import { mintTokensFromSafe } from "./mintTokens";  
import { deployTokenPoolWithSafe } from "./deployTokenPool";
import { claimAndAcceptAdminRoleFromSafe } from "./claimAndAcceptAdminRole";
import { setPoolFromSafe } from "./setPool";
import { acceptOwnershipFromSafe } from "./acceptOwnership";
import { applyChainUpdatesFromSafe } from "./applyChainUpdates";

export const safeMultisigTasks = [
    deploySafe,
    deployTokenWithSafe,
    grantMintBurnRoleFromSafe,
    mintTokensFromSafe,
    deployTokenPoolWithSafe,
    claimAndAcceptAdminRoleFromSafe,
    setPoolFromSafe,
    acceptOwnershipFromSafe,
    applyChainUpdatesFromSafe
];