const messageExecutionState = require("../../../config/messageState.json");

const getMessageState = (status) => {
  if (status in messageExecutionState) {
    return messageExecutionState[status];
  }
  return "unknown";
};

module.exports = {
  getMessageState,
};
