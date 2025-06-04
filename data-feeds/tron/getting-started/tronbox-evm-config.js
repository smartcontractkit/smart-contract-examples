module.exports = {
  networks: {
    bttc: {
      // Don't put your private key here:
      privateKey: process.env.PRIVATE_KEY_BTTC,
      /**
       * Create a .env file (it must be gitignored) containing something like
       *
       *   export PRIVATE_KEY_BTTC=4E7FEC...656243
       *
       * Then, run the migration with:
       *
       *   source .env && tronbox migrate --network bttc --evm
       */
      fullHost: 'https://rpc.bt.io',
      // gas: 8500000, // Gas sent with each transaction
      // gasPrice: '500000000000000', // 500,000 gwei (in wei)
      network_id: '1'
    },
    donau: {
      privateKey: process.env.PRIVATE_KEY_DONAU,
      fullHost: 'https://pre-rpc.bt.io',
      network_id: '2'
    },
    development: {
      privateKey: process.env.PRIVATE_KEY_DEV,
      fullHost: 'http://127.0.0.1:8545',
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
