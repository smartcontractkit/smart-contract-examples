import { emitLog } from "./emitLog.js";
import { getLastPrice } from "./getLastRetrievedPrice.js";
import { registerUpkeep } from "./registerAndFundLogUpkeep.js";
import { transferLink } from "./transferLink.js";

export const tasks = [emitLog, getLastPrice, registerUpkeep, transferLink];
