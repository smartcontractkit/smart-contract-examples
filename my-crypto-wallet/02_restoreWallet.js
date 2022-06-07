const { mnemonicToEntropy } = require("ethereum-cryptography/bip39");
const { wordlist } = require("ethereum-cryptography/bip39/wordlists/english");
const { HDKey } = require("ethereum-cryptography/hdkey");
const { getPublicKey } = require("ethereum-cryptography/secp256k1");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { bytesToHex } = require("ethereum-cryptography/utils");
const { writeFileSync } = require("fs");

async function main(_mnemonic) {
  const entropy = mnemonicToEntropy(_mnemonic, wordlist);
  const hdRootKey = HDKey.fromMasterSeed(entropy);
  const privateKey = hdRootKey.deriveChild(0).privateKey;
  const publicKey = getPublicKey(privateKey);
  const address = keccak256(publicKey).slice(-20);
  console.log(`Account One Wallet Address: 0x${bytesToHex(address)}`);

  const accountOne = {
    privateKey: privateKey,
    publicKey: publicKey,
    address: address,
  };
  const accountOneData = JSON.stringify(accountOne);
  writeFileSync("account 1.json", accountOneData);
}

main(process.argv[2])
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
