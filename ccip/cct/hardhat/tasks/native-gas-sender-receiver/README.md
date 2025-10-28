# Native Gas Sender Receiver Tasks

This folder contains Hardhat tasks for deploying and interacting with the Chainlink CCIP `EtherSenderReceiver` contract, which enables cross-chain native ETH transfers.

## Available Tasks

### `deployEtherSenderReceiver`
Deploy the EtherSenderReceiver contract on a network.

```bash
npx hardhat deployEtherSenderReceiver --network ethereumSepolia --verifycontract
```

**Example Output:**
```
✅ Tasks loaded from /tasks/index.ts
🚀 Deploying EtherSenderReceiver on ethereumSepolia...
📍 Using CCIP Router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59
⏳ Deployment tx: 0x8217cb99b9f8eff22a51f1e834205afc1293c8303e4887f329cc7825972335c6
   Waiting for 3 confirmation(s)...
✅ EtherSenderReceiver deployed at: 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8
🔍 Verifying contract...

📤 Submitted source code for verification on Etherscan:
  @chainlink/contracts-ccip/contracts/applications/EtherSenderReceiver.sol:EtherSenderReceiver
  Address: 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8

⏳ Waiting for verification result...

✅ Contract verified successfully on Etherscan!
  Explorer: https://sepolia.etherscan.io/address/0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8#code

🎉 Deployment completed successfully!
📋 Contract Information:
   Address: 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8
   Network: ethereumSepolia (Chain ID: 11155111)
   Version: EtherSenderReceiver 1.5.0
   Router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59
   WETH: 0x097D90c9d3E0B50Ca60e1ae45F6A81010f9FB534
   Verified: ✅ Yes
```

**Arbitrum Sepolia:**
```bash
npx hardhat deployEtherSenderReceiver --network arbitrumSepolia --verifycontract
```

**Example Output:**
```
✅ Tasks loaded from /tasks/index.ts
🚀 Deploying EtherSenderReceiver on arbitrumSepolia...
📍 Using CCIP Router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165
⏳ Deployment tx: 0x480e315f1a88d4996fc49bda7a6df348a919e277b6252a34714bcf3288e422f9
   Waiting for 2 confirmation(s)...
✅ EtherSenderReceiver deployed at: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
🔍 Verifying contract...

📤 Submitted source code for verification on Arbiscan:
  @chainlink/contracts-ccip/contracts/applications/EtherSenderReceiver.sol:EtherSenderReceiver
  Address: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2

⏳ Waiting for verification result...

✅ Contract verified successfully on Arbiscan!
  Explorer: https://sepolia.arbiscan.io/address/0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2#code

🎉 Deployment completed successfully!
📋 Contract Information:
   Address: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Network: arbitrumSepolia (Chain ID: 421614)
   Version: EtherSenderReceiver 1.5.0
   Router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165
   WETH: 0xE591bf0A0CF924A0674d7792db046B23CEbF5f34
   Verified: ✅ Yes
```

### `sendEther`
Send ETH cross-chain using the deployed contract.

#### Sending to EtherSenderReceiver Contract (Default)
When sending to an EtherSenderReceiver contract, the receiver gets native ETH via ccipReceive:

```bash
npx hardhat sendEther \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken native \
  --network ethereumSepolia
```

**Example Output:**
```
✅ Tasks loaded from /tasks/index.ts
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000214971110551261 ETH
🛡️  Fee with 10% buffer: 0.000236468221606387 ETH
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x07419b3c454c52e6917748680a983acb28d861b3fd936af8b66a32e4a0b8bf76
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x07419b3c454c52e6917748680a983acb28d861b3fd936af8b66a32e4a0b8bf76
   Block: 9510460
   Gas Used: 234950
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.000214971110551261 ETH
👉 Track cross-chain status: https://ccip.chain.link/tx/0x07419b3c454c52e6917748680a983acb28d861b3fd936af8b66a32e4a0b8bf76
```

**Estimate-Only Mode:**
```bash
npx hardhat sendEther \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken native \
  --estimateonly \
  --network ethereumSepolia
```

**Example Output:**
```
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000211334930545389 ETH
🛡️  Fee with 10% buffer: 0.000232468423599927 ETH
📊 Fee estimation completed (estimate-only mode)
   Wallet ETH Cost: 0.001211334930545389 ETH
     (0.001 ETH transfer + 0.000211334930545389 ETH fee)
```

**LINK Fee Payment:**
```bash
npx hardhat sendEther \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken link \
  --network ethereumSepolia
```

**Example Output:**
```
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.045226197996850688 LINK
🛡️  Fee with 10% buffer: 0.049748817796535756 LINK
🔓 Approving LINK for fee payment...
⏳ Approval tx: 0x8ac829ddde8b02c4c6017678903e94562236584e64cc03b57460d115572e7c13
   Waiting for 3 confirmation(s)...
✅ LINK approval confirmed
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x3a831dadf27a81607882750d55f3f664ea7fc6665296be93233ec5703d78ce70
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x3a831dadf27a81607882750d55f3f664ea7fc6665296be93233ec5703d78ce70
   Block: 9511697
   Gas Used: 245580
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.045226197996850688 LINK
👉 Track cross-chain status: https://ccip.chain.link/tx/0x3a831dadf27a81607882750d55f3f664ea7fc6665296be93233ec5703d78ce70
```

**Wrapped Native Fee Payment (WETH):**
```bash
npx hardhat sendEther \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.001 \
  --feetoken wrappedNative \
  --network ethereumSepolia
```

**Example Output:**
```
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000211334930545389 WETH
🛡️  Fee with 10% buffer: 0.000232468423599927 WETH
🔓 Approving WETH for fee payment...
⏳ Approval tx: 0xe7c4c0e052d3140baf4aac5ed3136167883a281b1538047eff72c557175ec3fa
   Waiting for 3 confirmation(s)...
✅ WETH approval confirmed
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x634ac812632e8ccb95e15dc1d600a483d5afb003ead0d96b87b3adf3ed7e3cfd
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x634ac812632e8ccb95e15dc1d600a483d5afb003ead0d96b87b3adf3ed7e3cfd
   Block: 9511706
   Gas Used: 230353
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (sender)
   Fee: 0.000211334930545389 WETH
👉 Track cross-chain status: https://ccip.chain.link/tx/0x634ac812632e8ccb95e15dc1d600a483d5afb003ead0d96b87b3adf3ed7e3cfd
```

#### Sending to EOA/Simple Contract (Gas Limit 0)
When sending to an EOA or simple contract that doesn't implement ccipReceive, use `--gaslimit 0` for significant fee savings. The receiver gets wrapped native tokens only:

```bash
npx hardhat sendEther \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x9d087fc03ae39b088326b67fa3c788236645b717 \
  --amount 0.001 \
  --feetoken native \
  --gaslimit 0 \
  --network ethereumSepolia
```

**Example Output:**
```
✅ Tasks loaded from /tasks/index.ts
🚀 Sending ETH cross-chain from ethereumSepolia to arbitrumSepolia...
⚡ Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)
💰 Amount: 0.001 ETH (1000000000000000 wei)
🔍 Estimating fees...
💸 Estimated fee: 0.000089234567891234 ETH
🛡️  Fee with 10% buffer: 0.000098158024680257 ETH
📤 Sending cross-chain transaction...
⏳ Transaction sent: 0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
   Waiting for 3 confirmation(s)...
🎉 Cross-chain transfer completed successfully!
📋 Transaction Summary:
   Hash: 0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
   Block: 9512000
   Gas Used: 180000
   From: ethereumSepolia → To: arbitrumSepolia
   Amount: 0.001 ETH
   Destination Contract: 0x9d087fc03ae39b088326b67fa3c788236645b717
   Final Recipient: 0x9d087fc03ae39b088326b67fa3c788236645b717 (receiver gets WETH)
   Fee: 0.000089234567891234 ETH
👉 Track cross-chain status: https://ccip.chain.link/tx/0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
```

### `estimateEtherFee`
Estimate fees for cross-chain ETH transfers with different fee token options.

#### Standard Transfer to EtherSenderReceiver Contract

**Native Fee (ETH):**
```bash
npx hardhat estimateEtherFee \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.01 \
  --feetoken native \
  --network ethereumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: ethereumSepolia
   To: arbitrumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.00021508638013175 ETH
   Wallet ETH Cost: 0.01021508638013175 ETH
     (0.01 ETH transfer + 0.00021508638013175 ETH fee)
💰 Wallet Balance Check:
   ETH Balance: 572.728461876833496011 ETH ✅ Sufficient (need 0.01021508638013175 ETH)
```

**LINK Fee:**
```bash
npx hardhat estimateEtherFee \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.01 \
  --feetoken link \
  --network ethereumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: ethereumSepolia
   To: arbitrumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.046077938353863807 LINK
   Wallet ETH Cost: 0.01 ETH (transfer only)
   Wallet LINK Cost: 0.046077938353863807 LINK (fee only)
💰 Wallet Balance Check:
   ETH Balance: 572.728461876833496011 ETH ✅ Sufficient (need 0.01 ETH)
   LINK Balance: 1098.659022304879598633 LINK ✅ Sufficient (need 0.046077938353863807 LINK)
```

**Wrapped Native Fee (WETH):**
```bash
npx hardhat estimateEtherFee \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --amount 0.01 \
  --feetoken wrappedNative \
  --network ethereumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: ethereumSepolia
   To: arbitrumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.000214217304305138 WETH
   Wallet ETH Cost: 0.01 ETH (transfer only)
   Wallet WETH Cost: 0.000214217304305138 WETH (fee only)
💰 Wallet Balance Check:
   ETH Balance: 572.728461876833496011 ETH ✅ Sufficient (need 0.01 ETH)
   WETH Balance: 0.999379097222222223 WETH ✅ Sufficient (need 0.000214217304305138 WETH)
```

**Arbitrum Sepolia Examples:**

**Native Fee (ETH) - L2 to L1:**
```bash
npx hardhat estimateEtherFee \
  --contract 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --destinationchain ethereumSepolia \
  --receiver 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --amount 0.01 \
  --feetoken native \
  --network arbitrumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: arbitrumSepolia
   To: ethereumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.000121991673255842 ETH
   Wallet ETH Cost: 0.010121991673255842 ETH
     (0.01 ETH transfer + 0.000121991673255842 ETH fee)
💰 Wallet Balance Check:
   ETH Balance: 102.12032631554766 ETH ✅ Sufficient (need 0.010121991673255842 ETH)
```

**LINK Fee - L2 to L1:**
```bash
npx hardhat estimateEtherFee \
  --contract 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --destinationchain ethereumSepolia \
  --receiver 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --amount 0.01 \
  --feetoken link \
  --network arbitrumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: arbitrumSepolia
   To: ethereumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.024484789571788002 LINK
   Wallet ETH Cost: 0.01 ETH (transfer only)
   Wallet LINK Cost: 0.024484789571788002 LINK (fee only)
💰 Wallet Balance Check:
   ETH Balance: 102.12032631554766 ETH ✅ Sufficient (need 0.01 ETH)
   LINK Balance: 68.196830889211063701 LINK ✅ Sufficient (need 0.024484789571788002 LINK)
```

**Wrapped Native Fee (WETH) - Shows Insufficient Balance:**
```bash
npx hardhat estimateEtherFee \
  --contract 0x3EAC47F1EBacBd2Eb1f1B872092a01774098A3a2 \
  --destinationchain ethereumSepolia \
  --receiver 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --amount 0.01 \
  --feetoken wrappedNative \
  --network arbitrumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: arbitrumSepolia
   To: ethereumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.000121991673255842 WETH
   Wallet ETH Cost: 0.01 ETH (transfer only)
   Wallet WETH Cost: 0.000121991673255842 WETH (fee only)
💰 Wallet Balance Check:
   ETH Balance: 102.12032631554766 ETH ✅ Sufficient (need 0.01 ETH)
   WETH Balance: 0 WETH ❌ Insufficient (need 0.000121991673255842 WETH)
⚠️  Please ensure you have sufficient balances before sending!
```

#### Optimized Transfer to EOA/Simple Contract (Gas Limit 0)

**Native Fee with Gas Limit 0:**
```bash
npx hardhat estimateEtherFee \
  --contract 0x26153D479bdf325f7DB482e27982d8fD1C3Bb0b8 \
  --destinationchain arbitrumSepolia \
  --receiver 0x9d087fc03ae39b088326b67fa3c788236645b717 \
  --amount 0.01 \
  --feetoken native \
  --gaslimit 0 \
  --network ethereumSepolia
```

**Example Output:**
```
🔍 Estimating cross-chain ETH transfer fees...
   From: ethereumSepolia
   To: arbitrumSepolia
   Amount: 0.01 ETH
   Destination Contract: 0x9d087fc03ae39b088326b67fa3c788236645b717
   Gas limit: 0 (receiver will get wrapped native tokens only - no ccipReceive call)
💸 Calculating fees...
📊 Fee Estimation Results:
   Transfer Amount: 0.01 ETH
   CCIP Fee: 0.000089234567891234 ETH
   Wallet ETH Cost: 0.010089234567891234 ETH
     (0.01 ETH transfer + 0.000089234567891234 ETH fee)
💰 Wallet Balance Check:
   ETH Balance: 572.728461876833496011 ETH ✅ Sufficient (need 0.010089234567891234 ETH)
```

**Note:** Using `--gaslimit 0` can reduce fees by ~60% compared to standard transfers, as no gas is allocated for ccipReceive execution. The receiver gets wrapped native tokens (WETH) instead of native ETH.

## Features

- ✅ **Cross-chain ETH transfers** - Send native ETH between supported CCIP chains
- ✅ **Fee estimation** - Get accurate cost estimates before sending
- ✅ **Dual fee payment** - Pay fees in native tokens or LINK
- ✅ **Contract verification** - Automatic Etherscan verification
- ✅ **Balance validation** - Validate sufficient funds before transfers
- ✅ **Error handling** - Comprehensive validation and error messages

## Supported Networks

- Avalanche Fuji
- Ethereum Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Polygon Amoy

## Contract Details

The `EtherSenderReceiver` contract:
- Wraps native ETH to WETH for CCIP transfer
- Automatically unwraps WETH back to native ETH on destination
- Handles fee payments in native tokens or LINK
- Provides graceful error recovery for failed transfers
- Is ownerless and permissionless by design
