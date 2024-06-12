"use client";

const Card = ({ joke }) => {
  console.log(joke);
  if (!joke) {
    return null; // or you can render a loading state or placeholder
  }
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="font-sans text-4xl font-bold mb-4 text-primaryDark">
        {joke.setup}
      </h2>
      <p className="font-sans text-2xl text-primaryDark">{joke.punchline}</p>
    </div>
  );
};
export default Card;
