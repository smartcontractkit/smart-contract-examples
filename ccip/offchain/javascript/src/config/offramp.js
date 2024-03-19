const messageExecutionState = require("../../../config/messageState.json");

const getMessageStatus = (status) => {
  if (status in messageExecutionState) {
    return messageExecutionState[status];
  }
  return "unknown";
};

module.exports = {
  getMessageStatus,
};
