const RewardSection = ({ index, handleVote }) => {
  return (
    <>
      <div className="justify-center flex pt-5 text-primaryDark font-sans text-3xl font-bold">
        Reward The Joke
      </div>
      <div className="flex justify-center space-x-20 pt-4">
        <button
          className="text-5xl focus:outline-none"
          onClick={() => handleVote(index, 0)}
        >
          😆
        </button>
        <button
          className="text-5xl focus:outline-none"
          onClick={() => handleVote(index, 1)}
        >
          🤣
        </button>
        <button
          className="text-5xl focus:outline-none"
          onClick={() => handleVote(index, 2)}
        >
          😫
        </button>
      </div>
    </>
  );
};
export default RewardSection;
