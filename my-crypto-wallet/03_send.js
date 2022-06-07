const { getDefaultProvider, Wallet, utils } = require("ethers");
const { readFileSync } = require("fs");

async function main(_receiverAddress, _ethAmount) {
  const network = "goerli";
  const provider = getDefaultProvider(network);

  const accountRawData = readFileSync("account 1.json", "utf8");
  const accountData = JSON.parse(accountRawData);

  const privateKey = Object.values(accountData.privateKey);

  const signer = new Wallet(privateKey, provider);

  const transaction = await signer.sendTransaction({
    to: _receiverAddress,
    value: utils.parseEther(_ethAmount),
  });

  console.log(transaction);
}

main(process.argv[2], process.argv[3])
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
