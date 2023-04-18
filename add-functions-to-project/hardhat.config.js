/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
      compilers: [
        {
          version: "0.8.7",
          settings: {
            optimizer: {
              enabled: true,
              runs: 1_000,
            },
          },
        },
        {
          version: "0.6.6",
          settings: {
            optimizer: {
              enabled: true,
              runs: 1_000,
            },
          },
        },
        {
          version: "0.4.24",
          settings: {
            optimizer: {
              enabled: true,
              runs: 1_000,
            },
          },
        },
      ],
    },
};
