import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";

/**
 * Script to calculate the CCIP TokenPool Configuration PDA on Solana
 *
 * Purpose:
 * This script finds the Program Derived Address (PDA) that stores the configuration
 * for a CCIP TokenPool on Solana, then encodes it to hex format for use in EVM
 * pool configuration when setting up cross-chain operations.
 *
 * The PDA is derived using:
 * - Seeds: ["ccip_tokenpool_config", token_mint.toBuffer()]
 * - Program: The Solana pool program address
 *
 * The result can be used as the remote pool address when configuring EVM pools
 * to interact with Solana pools in cross-chain CCIP operations.
 */

/**
 * Converts a Solana address to hex format for EVM compatibility
 * @param address - Solana address in base58 format
 * @returns Hex representation with 0x prefix for EVM usage
 */
function solanaAddressToHex(address: string): string {
  const bytes = bs58.decode(address);
  return "0x" + Buffer.from(bytes).toString("hex");
}

/**
 * Calculate the CCIP TokenPool Configuration PDA
 * @param tokenMintAddress - The token mint address on Solana
 * @param poolProgramAddress - The CCIP pool program address on Solana
 * @returns Object containing the PDA, bump, and addresses
 */
function calculatePoolConfigPda(
  tokenMintAddress: string,
  poolProgramAddress: string
) {
  // Convert string addresses to PublicKey objects
  const mint = new PublicKey(tokenMintAddress);
  const poolProgram = new PublicKey(poolProgramAddress);

  // Find the PDA using the CCIP tokenpool config seeds
  const [poolConfig, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("ccip_tokenpool_config"), mint.toBuffer()],
    poolProgram
  );

  return {
    poolConfig,
    bump,
    mint,
    poolProgram,
    tokenMintAddress,
    poolProgramAddress,
  };
}

/**
 * Displays usage information
 */
function showUsage() {
  console.log(`
Usage: npx tsx scripts/calculateCCIPTokenPoolPDA.ts <token-mint-address> <pool-program-address>

Calculate the CCIP TokenPool Configuration PDA on Solana and encode it for EVM usage.

Purpose:
  Find the Program Derived Address (PDA) that stores CCIP token pool configuration
  on Solana, then convert it to hex format for configuring EVM pools in cross-chain
  CCIP operations.

Arguments:
  token-mint-address     Token mint address on Solana (base58 format)
  pool-program-address   CCIP pool program address on Solana (base58 format)

Examples:
  # Calculate PDA for CCIP token pool configuration
  npx tsx scripts/calculateCCIPTokenPoolPDA.ts 3PjyGzj1jGVgHSKS4VR1Hr1memm63PmN8L9rtPDKwzZ6 BqGg42v35Ghuigi4smWU9KKQTUnQb5ATocDbJikHjocS

  # Show help
  npx tsx scripts/calculateCCIPTokenPoolPDA.ts --help

Output:
  The script will:
  1. Validate both Solana addresses
  2. Calculate PDA using seeds: ["ccip_tokenpool_config", token_mint.toBuffer()]
  3. Display the PDA in both Solana base58 and hex formats
  4. Show the bump seed used
  5. Provide the hex-encoded result for EVM pool configuration

Use Cases:
  • Setting up cross-chain CCIP operations between Solana and EVM chains
  • Configuring EVM pools to interact with Solana token pools
  • Finding the configuration PDA for existing Solana CCIP pools
  • Converting Solana addresses to EVM-compatible hex format for smart contracts

Expected Result Example:
  • Token: 3PjyGzj1jGVgHSKS4VR1Hr1memm63PmN8L9rtPDKwzZ6
  • Pool Program: BqGg42v35Ghuigi4smWU9KKQTUnQb5ATocDbJikHjocS
  • PDA Result: DM2trtNEkqFJp66Fm6sUdJRk7imkNeRWUJZ5WVkiYs97
  • Hex for EVM: 0xb76e004212e3a61098245d47832222a018fcb3b18c0278ac1fb06c2d9f9b86a6
`);
}

/**
 * Validates a Solana address
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }

  if (args.length !== 2) {
    console.error(
      "❌ Error: Exactly 2 arguments required (token-mint-address and pool-program-address)"
    );
    showUsage();
    process.exit(1);
  }

  const [tokenMintStr, poolProgramStr] = args;

  // Validate addresses
  if (!isValidSolanaAddress(tokenMintStr)) {
    console.error(`❌ Error: Invalid token mint address: ${tokenMintStr}`);
    process.exit(1);
  }

  if (!isValidSolanaAddress(poolProgramStr)) {
    console.error(`❌ Error: Invalid pool program address: ${poolProgramStr}`);
    process.exit(1);
  }

  console.log("=== CCIP TokenPool Configuration PDA Calculation ===");
  console.log(`Token Mint Address: ${tokenMintStr}`);
  console.log(`Token Mint (hex): ${solanaAddressToHex(tokenMintStr)}`);
  console.log(`Pool Program Address: ${poolProgramStr}`);
  console.log(`Pool Program (hex): ${solanaAddressToHex(poolProgramStr)}`);
  console.log("\nCalculating TokenPool Config PDA...\n");

  // Calculate and log the result
  try {
    const { poolConfig, bump } = calculatePoolConfigPda(
      tokenMintStr,
      poolProgramStr
    );
    const poolConfigAddress = poolConfig.toString();
    const poolConfigHex = solanaAddressToHex(poolConfigAddress);

    console.log("=== PDA Calculation Result ===");
    console.log(`✅ Pool Config PDA: ${poolConfigAddress}`);
    console.log(`🔗 Pool Config PDA (hex for EVM): ${poolConfigHex}`);
    console.log(`📊 Bump Seed: ${bump}`);

    // PDA derivation details
    console.log("\n=== PDA Derivation Details ===");
    console.log(`Seeds used:`);
    console.log(`  1. "ccip_tokenpool_config" (string literal)`);
    console.log(`  2. ${tokenMintStr} (token mint address bytes)`);
    console.log(`Program: ${poolProgramStr}`);

    // Usage instructions
    console.log("\n=== Usage Instructions ===");
    console.log("📋 For EVM pool configuration, use this hex address:");
    console.log(`   ${poolConfigHex}`);
  } catch (error) {
    console.error("❌ Error calculating PDA:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export functions for potential reuse
export { calculatePoolConfigPda, solanaAddressToHex };
