const messageExecutionState = {
  0: "UNTOUCHED",
  1: "IN_PROGRESS",
  2: "SUCCESS",
  3: "FAILURE",
};

const getMessageState = (status) => {
  if (status in messageExecutionState) {
    return messageExecutionState[status];
  }
  return "unknown";
};

module.exports = {
    getMessageState,
};
