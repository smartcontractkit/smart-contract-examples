/**
 * @title Chainlink Data Feed Reader for TRON
 * @notice This script demonstrates how to read price data from Chainlink Data Feeds on TRON
 * @dev This example shows interaction with a deployed DataFeedReader contract
 *
 * Prerequisites:
 * 1. Install dependencies: npm install tronweb dotenv
 * 2. Create .env file with PRIVATE_KEY_NILE=your_private_key
 * 3. Deploy the DataFeedReader contract to get the contract address
 */

const { TronWeb } = require("tronweb");
require("dotenv").config();

// ====================================
// Configuration
// ====================================

// Initialize TronWeb with Nile Testnet configuration
const tronWeb = new TronWeb({
  fullHost: "https://nile.trongrid.io", // TRON Nile Testnet RPC endpoint
  privateKey: process.env.PRIVATE_KEY_NILE, // Your wallet private key from .env file
});

// Contract addresses - Replace with your deployed contract address
const CONTRACT_ADDRESS = "TTZEzaRUfrSm2ENfkhrPzk5mMEkZVwS3eD"; // Your DataFeedReader contract

// Chainlink Price Feed addresses on TRON Nile Testnet
// Find more at: https://docs.chain.link/data-feeds/price-feeds/addresses?network=tron
const PRICE_FEEDS = {
  BTC_USD: "TD3hrfAtPcnkLSsRh4UTgjXBo6KyRfT1AR", // BTC/USD price feed
  ETH_USD: "TYaLVmqGzz33ghKEMTdC64dUnde5LZc6Y3", // ETH/USD price feed
};

// ====================================
// Helper Functions
// ====================================

/**
 * Converts a timestamp to a human-readable date
 * @param {number|bigint} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  // Handle both BigInt and regular numbers
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString();
}

/**
 * Formats a price with proper decimal places
 * @param {bigint|number} rawPrice - Raw price from Chainlink
 * @param {number|bigint} decimals - Number of decimal places for this feed
 * @returns {string} Formatted price string
 */
function formatPrice(rawPrice, decimals = 8) {
  // Convert BigInt to string first, then to number for calculation
  const priceStr = rawPrice.toString();
  const decimalNum = typeof decimals === "bigint" ? Number(decimals) : decimals;
  const divisor = Math.pow(10, decimalNum);
  const price = parseFloat(priceStr) / divisor;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats the round ID for display
 * @param {bigint} roundId - Raw round ID as BigInt
 * @returns {string} Formatted round ID
 */
function formatRoundId(roundId) {
  return roundId.toString();
}

// ====================================
// Main Functions
// ====================================

/**
 * Reads and displays complete price data from a Chainlink feed
 * @param {string} feedAddress - Address of the Chainlink price feed
 * @param {string} feedName - Human-readable name for the feed (e.g., "BTC/USD")
 */
async function readPriceFeedData(feedAddress, feedName) {
  try {
    console.log(`\n🔍 Reading ${feedName} Price Feed Data...`);
    console.log(`📍 Feed Address: ${feedAddress}`);
    console.log("─".repeat(50));

    // Get the contract instance
    const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

    // Call the contract function to get latest round data
    const rawData = await contract
      .getChainlinkDataFeedLatestAnswer(feedAddress)
      .call();

    // Extract the returned values
    const [roundId, answer, startedAt, updatedAt, answeredInRound] = rawData;

    // Get additional information about the feed
    const decimals = await contract.getDecimals(feedAddress).call();
    const description = await contract.getDescription(feedAddress).call();

    // Display the results in a beautiful format
    console.log(`📊 ${description}`);
    console.log(`💰 Current Price: $${formatPrice(answer, decimals)}`);
    console.log(`🔢 Raw Price Value: ${answer.toString()}`);
    console.log(`📏 Decimals: ${decimals}`);
    console.log(`🆔 Round ID: ${formatRoundId(roundId)}`);
    console.log(`🕐 Started At: ${formatTimestamp(startedAt)}`);
    console.log(`🕒 Updated At: ${formatTimestamp(updatedAt)}`);
    console.log(`✅ Answered In Round: ${formatRoundId(answeredInRound)}`);

    // Calculate how fresh the data is
    const now = Math.floor(Date.now() / 1000);
    const updatedAtNum =
      typeof updatedAt === "bigint" ? Number(updatedAt) : updatedAt;
    const ageInSeconds = now - updatedAtNum;
    const ageInMinutes = Math.floor(ageInSeconds / 60);

    console.log(`⏰ Data Age: ${ageInMinutes} minutes ago`);

    return {
      price: formatPrice(answer, decimals),
      rawPrice: answer.toString(),
      decimals,
      description,
      updatedAt: Number(updatedAt),
      roundId: formatRoundId(roundId),
    };
  } catch (error) {
    console.error(`❌ Error reading ${feedName} price feed:`, error.message);
    throw error;
  }
}

/**
 * Demonstrates just getting the price (simplified version)
 * @param {string} feedAddress - Address of the Chainlink price feed
 * @param {string} feedName - Human-readable name for the feed
 */
async function getSimplePrice(feedAddress, feedName) {
  try {
    console.log(`\n💡 Simple ${feedName} Price Check:`);

    const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

    // Use the simplified function that only returns the price
    const rawPrice = await contract.getLatestPrice(feedAddress).call();
    const decimals = await contract.getDecimals(feedAddress).call();

    console.log(`💰 ${feedName}: $${formatPrice(rawPrice, decimals)}`);

    return formatPrice(rawPrice, decimals);
  } catch (error) {
    console.error(
      `❌ Error getting simple price for ${feedName}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Main function that demonstrates reading from multiple price feeds
 */
async function readDataFeeds() {
  try {
    console.log("🚀 Starting Chainlink Data Feed Reader");
    console.log("🌐 Network: TRON Nile Testnet");
    console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
    console.log("═".repeat(60));

    // Read detailed data from BTC/USD feed
    const btcData = await readPriceFeedData(PRICE_FEEDS.BTC_USD, "BTC/USD");

    // Read detailed data from ETH/USD feed
    const ethData = await readPriceFeedData(PRICE_FEEDS.ETH_USD, "ETH/USD");

    // Demonstrate the simple price reading
    console.log("\n" + "═".repeat(60));
    console.log("📱 SIMPLE PRICE DEMO");
    console.log("═".repeat(60));

    await getSimplePrice(PRICE_FEEDS.BTC_USD, "BTC/USD");
    await getSimplePrice(PRICE_FEEDS.ETH_USD, "ETH/USD");

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("📈 PRICE SUMMARY");
    console.log("═".repeat(60));
    console.log(`🟠 Bitcoin: $${btcData.price}`);
    console.log(`🔵 Ethereum: $${ethData.price}`);
    console.log("\n✅ All price feeds read successfully!");
  } catch (error) {
    console.error("💥 Fatal error:", error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check your .env file has PRIVATE_KEY_NILE set");
    console.log("2. Verify the contract address is correct");
    console.log("3. Ensure you're connected to TRON Nile Testnet");
    console.log("4. Check that the DataFeedReader contract is deployed");
  }
}

// ====================================
// Execute the script
// ====================================

// Run the main function when script is executed
if (require.main === module) {
  readDataFeeds();
}

// Export functions for potential use in other scripts
module.exports = {
  readPriceFeedData,
  getSimplePrice,
  readDataFeeds,
  formatPrice,
  formatTimestamp,
};
