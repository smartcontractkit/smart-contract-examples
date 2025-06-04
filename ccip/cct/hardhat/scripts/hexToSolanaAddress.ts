import bs58 from "bs58";

/**
 * Converts a hex string to a Solana address in base58 format
 * 
 * @param hexAddress - The hex address string (with or without 0x prefix)
 * @returns The address in Solana's base58 format
 */
function convertHexToSolanaAddress(hexAddress: string): string {
  // Remove 0x prefix if present
  const cleanHex = hexAddress.startsWith("0x") ? hexAddress.slice(2) : hexAddress;
  
  // Convert hex to bytes
  const bytes = Buffer.from(cleanHex, "hex");
  
  // Encode bytes to base58 (Solana's address format)
  return bs58.encode(bytes);
}

// Hardcoded addresses to convert
const remotePoolAddressHex = "0xfa660f4126d0c44d54693809f03192b127f0ce1a1864b3bb4f6ed0ca019d0ac8";
const remoteTokenAddressHex = "0x9371c6ba34f038551aa6abcbc6b234430538ccdca7a5d729b73cab9212ec7f2c";

// Convert the addresses
const remotePoolAddressSolana = convertHexToSolanaAddress(remotePoolAddressHex);
const remoteTokenAddressSolana = convertHexToSolanaAddress(remoteTokenAddressHex);

// Output the results
console.log("=== Hex to Solana Address Conversion ===");
console.log(`Remote Pool Address:`);
console.log(`  Hex:    ${remotePoolAddressHex}`);
console.log(`  Solana: ${remotePoolAddressSolana}`);
console.log();
console.log(`Remote Token Address:`);
console.log(`  Hex:    ${remoteTokenAddressHex}`);
console.log(`  Solana: ${remoteTokenAddressSolana}`);

// Export for potential use in other scripts
export { convertHexToSolanaAddress }; 