"use client";
import Image from "next/image";

const ConnectButton = ({ handleClick }) => {
  return (
    <div className="flex justify-center">
      <button
        className="px-8 py-2 rounded-md flex flex-row items-center justify-center bg-primaryDark text-primaryLight font-sans"
        onClick={handleClick}
      >
        {/* Display the MetaMask Fox image */}
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
          alt="MetaMask Fox"
          width={25}
          height={25}
        />
        <h1 className="mx-auto">Connect Wallet</h1>
      </button>
    </div>
  );
};

export default ConnectButton;
