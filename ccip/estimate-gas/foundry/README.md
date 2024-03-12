# CCIP gas estimator using Hardhat

This guide is designed to help you accurately estimate the gas consumption of the `ccipReceive` function within a CCIP Receiver contract. Understanding the gas dynamics of this function is crucial for setting an appropriate gasLimit when sending a CCIP message from the Sender contract.

The `ccipReceive` function is crafted for educational purposes to demonstrate how gas consumption changes with computational complexity. It is structured to accept a `uint256` input representing the number of iterations a loop within the function will execute. This input is decoded from the received CCIP message as follows:

```solidity
uint256 iterations = abi.decode(any2EvmMessage.data, (uint256)); // abi-decoding of the receiver number of iterations
```

To mitigate excessive gas consumption and ensure predictability, the iterations variable is internally capped at `99`. The function achieves this by performing the modulo operation `iterations % 100`, thereby limiting the maximum number of iterations to `99`. The core logic of the function, including the iteration cap and the loop, is outlined below:

```solidity
// Initialize the result with the number of iterations
uint256 result = iterations;
// Cap the number of iterations to a maximum of 99
uint256 maxIterations = iterations % 100;

// Execute the loop, simulating computational work
for (uint256 i = 0; i < maxIterations; i++) {
    result += i;
}
```

By experimenting with different iterations values, developers can gain insights into optimal gas limit settings.

## Local testing

1. Build the project.

```bash
forge build
```

1. Test and display the `console.log` instructions.

```bash
forge test -vv --isolate
```

Example output:

```text
$ forge test -vv --isolate
[⠊] Compiling...
No files changed, compilation skipped

Ran 3 tests for test/SendReceive.t.sol:SenderReceiverTest
[PASS] test_SendReceiveAverage() (gas: 125166)
Logs:
  Number of iterations 50 - Gas used: 14740

[PASS] test_SendReceiveMax() (gas: 134501)
Logs:
  Number of iterations 99 - Gas used: 24099

[PASS] test_SendReceiveMin() (gas: 115581)
Logs:
  Number of iterations 0 - Gas used: 5190

Suite result: ok. 3 passed; 0 failed; 0 skipped; finished in 2.73ms (1.35ms CPU time)

Ran 1 test suite in 177.46ms (2.73ms CPU time): 3 tests passed, 0 failed, 0 skipped (3 total tests)
```

This table summarized the gas usage for different iterations:

| Number of iterations | Gas used |
| -------------------- | -------- |
| 0                    | 5190     |
| 50                   | 14740    |
| 99                   | 24099    |

As you can notice from the output, the gas usage increases with the number of iterations. This is a crucial insight for setting the gasLimit when sending a CCIP message from the Sender contract. The maximum gas usage is observed when the number of iterations is set to `99` (gas: `24099`).

**Remark**: Compare this with the results from the [Hardhat guide](../hardhat/README.md).
