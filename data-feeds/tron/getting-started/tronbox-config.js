module.exports = {
  networks: {
    mainnet: {
      // Don't put your private key here:
      privateKey: process.env.PRIVATE_KEY_MAINNET,
      /**
       * Create a .env file (it must be gitignored) containing something like
       *
       *   export PRIVATE_KEY_MAINNET=4E7FEC...656243
       *
       * Then, run the migration with:
       *
       *   source .env && tronbox migrate --network mainnet
       */
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.trongrid.io',
      network_id: '1'
    },
    shasta: {
      // Obtain test coin at https://shasta.tronex.io/
      privateKey: process.env.PRIVATE_KEY_SHASTA,
      userFeePercentage: 50,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.shasta.trongrid.io',
      network_id: '2'
    },
    nile: {
      // Obtain test coin at https://nileex.io/join/getJoinPage
      privateKey: process.env.PRIVATE_KEY_NILE,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://nile.trongrid.io',
      network_id: '3'
    },
    development: {
      // For tronbox/tre docker image
      // See https://hub.docker.com/r/tronbox/tre
      privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
      userFeePercentage: 0,
      feeLimit: 1000 * 1e6,
      fullHost: 'http://127.0.0.1:9090',
      network_id: '9'
    }
  },
  compilers: {
    solc: {
      version: '0.8.7',
      // An object with the same schema as the settings entry in the Input JSON.
      // See https://docs.soliditylang.org/en/latest/using-the-compiler.html#input-description
      settings: {
        // optimizer: {
        //   enabled: true,
        //   runs: 200
        // },
        // evmVersion: 'istanbul',
        // viaIR: true,
        remappings: [
          "@chainlink/contracts/=@chainlink/contracts/"
        ]
      }
    }
  }
};
