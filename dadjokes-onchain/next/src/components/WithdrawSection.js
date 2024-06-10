const WithdrawSection = ({ balance, handleWithdraw }) => {
  return (
    <>
      {((balance !== null && parseFloat(balance) > 0) || !balance) && (
        <div className="text-2xl">
          Balance: {balance} ETH
          <button
            className="bg-primaryDark text-primaryLight font-sans px-4 py-2 rounded"
            onClick={() => handleWithdraw()}
          >
            🤑 Cash Out
          </button>
        </div>
      )}
    </>
  );
};

export default WithdrawSection;
