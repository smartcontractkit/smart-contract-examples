const JokeModal = ({
  isModalOpen,
  setIsModalOpen,
  handleSubmit,
  setup,
  setSetup,
  punchline,
  setPunchline,
}) => {
  return (
    <>
      {isModalOpen && (
        // floating modal to add joke
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <div>
              <input
                className="border border-gray-300 rounded p-2 m-2"
                type="text"
                placeholder="Setup"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
              />
              <input
                className="border border-gray-300 rounded p-2 m-2"
                type="text"
                placeholder="Punchline"
                value={punchline}
                onChange={(e) => setPunchline(e.target.value)}
              />
            </div>
            {/* space the two items on either side of the div */}
            <div className="flex justify-between">
              <button
                onClick={() => handleSubmit(setup, punchline)}
                className="bg-primaryDark text-primaryLight font-sans px-4 py-2 rounded"
              >
                Submit
              </button>
              <button
                onClick={() => setIsModalOpen(!isModalOpen)}
                className="bg-primaryDark text-primaryLight font-sans px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JokeModal;
