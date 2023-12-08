const supportedNetworks = [
  "ethereumSepolia",
  "optimismGoerli",
  "avalancheFuji",
  "polygonMumbai",
  "bnbTestnet",
  "baseGoerli",
];

const ethereumSepolia = {
  address: "0x0bf3de8c5d3e8a2b34d2beeb17abfcebaf363a59",
  chainSelector: "16015286601757825753",
};

const optimismGoerli = {
  address: "0xcc5a0b910d9e9504a7561934bed294c51285a78d",
  chainSelector: "2664363617261496610",
};

const avalancheFuji = {
  address: "0xf694e193200268f9a4868e4aa017a0118c9a8177",
  chainSelector: "14767482510784806043",
};

const polygonMumbai = {
  address: "0x1035cabc275068e0f4b745a29cedf38e13af41b1",
  chainSelector: "12532609583862916517",
};

const bnbTestnet = {
  address: "0xe1053ae1857476f36a3c62580ff9b016e8ee8f6f",
  chainSelector: "13264668187771770619",
};

const baseGoerli = {
  address: "0x80af2f44ed0469018922c9f483dc5a909862fdc2",
  chainSelector: "5790810961207155433",
};

const getRouterConfig = (network) => {
  switch (network) {
    case "ethereumSepolia":
      return ethereumSepolia;
    case "optimismGoerli":
      return optimismGoerli;
    case "arbitrumTestnet":
      return arbitrumTestnet;
    case "avalancheFuji":
      return avalancheFuji;
    case "polygonMumbai":
      return polygonMumbai;
    case "bnbTestnet":
      return bnbTestnet;
    case "baseGoerli":
      return baseGoerli;
    default:
      throw new Error("Unknown network: " + network);
  }
};

module.exports = {
  getRouterConfig,
  supportedNetworks,
};
