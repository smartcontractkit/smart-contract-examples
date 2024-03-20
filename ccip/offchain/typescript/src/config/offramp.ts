import messageExecutionState from "../../../config/messageState.json";

const getMessageStatus = (status: bigint): string => {
  const statusKey = status.toString() as keyof typeof messageExecutionState;
  if (statusKey in messageExecutionState) {
    return messageExecutionState[statusKey];
  }
  return "unknown";
};

export { getMessageStatus };
