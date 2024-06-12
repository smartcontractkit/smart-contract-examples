"use client";

import { useState } from "react";
import Card from "@/components/Card";
import ConnectWallet from "@/components/ConnectWallet";
import { Button } from "@/components/Button";
import { useJokes } from "@/hooks/useJokes";

const Page = () => {
  const [currentJokeIndex, setCurrentJokeIndex] = useState(0);
  const jokes = useJokes();

  const handlePreviousJoke = () => {
    setCurrentJokeIndex((prevIndex) =>
      prevIndex === 0 ? jokes.length - 1 : prevIndex - 1
    );
  };

  const handleNextJoke = () => {
    setCurrentJokeIndex((prevIndex) =>
      prevIndex === jokes.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="relative h-screen bg-person-background">
      <div className="absolute top-0 left-0 right-0 p-8">
        <h1 className="font-sans text-8xl font-bold text-center text-primaryDark">
          Dad Jokes
        </h1>
        <p className="font-sans text-2xl text-center text-primaryDark mt-2">
          they used to be off the chain
        </p>
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
        <Card joke={jokes[currentJokeIndex]} />
        <div className="flex justify-between mt-4">
          <Button onClick={handlePreviousJoke}>Previous Joke</Button>
          <Button onClick={handleNextJoke}>Next Joke</Button>
        </div>
        <ConnectWallet
          index={currentJokeIndex}
          joke={jokes[currentJokeIndex]}
        />
      </div>
    </div>
  );
};

export default Page;
