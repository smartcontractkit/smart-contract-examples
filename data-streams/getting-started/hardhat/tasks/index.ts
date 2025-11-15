import { emitLog } from "./emitLog.js";
import { getLastPrice } from "./getLastRetrievedPrice.js";
import { registerUpkeep } from "./registerAndFundLogUpkeep.js";
import { transferLink } from "./transferLink.js";

export const tasks = [emitLog, getLastPrice, registerUpkeep, transferLink];
export const npmFilesToBuild = ["@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol"];
