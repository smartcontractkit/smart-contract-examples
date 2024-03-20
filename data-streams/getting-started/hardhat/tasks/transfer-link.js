const { BigNumber } = require("ethers")
const { networkConfig } = require("../helper-hardhat-config")
const utils = require("./utils")

// Define a minimal ERC20 ABI focusing on the functions needed for this task.
const minimalERC20ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
]

/**
 * Hardhat task for transferring LINK tokens to a specified recipient.
 * This task requires the recipient address and the amount of LINK (in Juels) to be transferred.
 * Optionally, a specific LINK token address can be provided; otherwise, it uses the address from the network configuration.
 */
task("transfer-link", "Transfer LINK tokens to a recipient")
  .addParam("recipient", "The address of the EOA or contract account that will receive your LINK tokens")
  .addParam("amount", "Amount in Juels. 1LINK=10**18 JUELS")
  .addOptionalParam("linkaddress", "Set the LINK token address")
  .setAction(async (taskArgs, hre) => {
    // Destructure task arguments for easier access.
    const { recipient: recipientAddress, amount, linkaddress } = taskArgs

    // Determine the network ID to fetch the corresponding LINK token address from the configuration.
    const networkId = hre.network.config.chainId
    if (!networkConfig[networkId] || !networkConfig[networkId]["linkToken"]) {
      throw new Error(`Network configuration not found for network ID ${networkId}`)
    }

    // Determine the LINK token address to use, either from the network configuration or the task argument.
    const linkTokenAddress = linkaddress || networkConfig[networkId]["linkToken"]

    // Instantiate the LINK token contract using its address and the minimal ERC20 ABI.
    const linkTokenContract = await hre.ethers.getContractAt(minimalERC20ABI, linkTokenAddress)

    // Get the signer's account to perform the transfer.
    const [signer] = await hre.ethers.getSigners()

    const spinner = utils.spin()
    spinner.info(`Starting LINK transfer from ${signer.address} to the streams upkeep contract at ${recipientAddress}`)
    spinner.info(`LINK token address: ${linkTokenAddress}`)
    // Check the signer's LINK token balance to ensure they have enough to complete the transfer.
    const balance = await linkTokenContract.balanceOf(signer.address)
    spinner.info(`LINK balance of sender ${signer.address} is ${hre.ethers.utils.formatEther(balance)} LINK`)

    // Convert the transfer amount to a BigNumber for comparison and transfer operations.
    const amountBN = BigNumber.from(amount)
    if (balance.gte(amountBN)) {
      // Perform the transfer if the balance is sufficient.
      const result = await linkTokenContract.connect(signer).transfer(recipientAddress, amount)
      await result.wait() // Wait for the transaction to be mined.
      spinner.succeed(
        `${hre.ethers.utils.formatEther(amountBN)} LINK were sent from ${
          signer.address
        } to ${recipientAddress}. Transaction Hash: ${result.hash}`
      )
    } else {
      // Log an error if the sender does not have enough LINK.
      spinner.fail(
        `Sender doesn't have enough LINK. Current balance is ${hre.ethers.utils.formatEther(
          balance
        )} LINK, but tried to send ${hre.ethers.utils.formatEther(amountBN)} LINK.`
      )
    }
  })

module.exports = {}
