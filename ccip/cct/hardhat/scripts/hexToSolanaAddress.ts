import bs58 from "bs58";

/**
 * Converts a hex string to a Solana address in base58 format
 *
 * @param hexAddress - The hex address string (with or without 0x prefix)
 * @returns The address in Solana's base58 format
 */
function convertHexToSolanaAddress(hexAddress: string): string {
  // Remove 0x prefix if present
  const cleanHex = hexAddress.startsWith("0x")
    ? hexAddress.slice(2)
    : hexAddress;

  // Validate hex string length (should be 64 characters for 32 bytes)
  if (cleanHex.length !== 64) {
    throw new Error(
      `Invalid hex address length: expected 64 characters, got ${cleanHex.length}`
    );
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
    throw new Error(`Invalid hex format: ${cleanHex}`);
  }

  // Convert hex to bytes
  const bytes = Buffer.from(cleanHex, "hex");

  // Encode bytes to base58 (Solana's address format)
  return bs58.encode(bytes);
}

/**
 * Displays usage information
 */
function showUsage() {
  console.log(`
Usage: npx ts-node scripts/hexToSolanaAddress.ts <hex-address> [hex-address2] [...]

Convert hex addresses to Solana base58 format.

Arguments:
  hex-address    Hex address string (with or without 0x prefix)
                 Must be 64 characters (32 bytes) for Solana addresses

Examples:
  # Convert a single address
  npx ts-node scripts/hexToSolanaAddress.ts 0xfa660f4126d0c44d54693809f03192b127f0ce1a1864b3bb4f6ed0ca019d0ac8

  # Convert multiple addresses at once
  npx ts-node scripts/hexToSolanaAddress.ts fa660f4126d0c44d54693809f03192b127f0ce1a1864b3bb4f6ed0ca019d0ac8 9371c6ba34f038551aa6abcbc6b234430538ccdca7a5d729b73cab9212ec7f2c

  # Address without 0x prefix works too
  npx ts-node scripts/hexToSolanaAddress.ts fa660f4126d0c44d54693809f03192b127f0ce1a1864b3bb4f6ed0ca019d0ac8

  # Show help
  npx ts-node scripts/hexToSolanaAddress.ts --help

Output:
  For each address, the script displays:
  • Original hex format (as provided)
  • Converted Solana base58 format
  • Error details if conversion fails

Use Cases:
  • Converting EVM contract addresses to Solana format for cross-chain operations
  • Preparing addresses for CCIP token pool configuration
  • Converting PDA addresses from hex representation
  • Batch processing multiple addresses for deployment scripts
  • Verifying address conversions in development workflows
`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }

  console.log("=== Hex to Solana Address Conversion ===\n");

  for (const [index, hexAddress] of args.entries()) {
    try {
      const solanaAddress = convertHexToSolanaAddress(hexAddress);

      console.log(`Address ${index + 1}:`);
      console.log(`  Hex:    ${hexAddress}`);
      console.log(`  Solana: ${solanaAddress}`);
      console.log();
    } catch (error) {
      console.error(
        `❌ Error converting address ${index + 1} (${hexAddress}):`
      );
      console.error(`   ${error instanceof Error ? error.message : error}`);
      console.log();
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for potential use in other scripts
export { convertHexToSolanaAddress };
