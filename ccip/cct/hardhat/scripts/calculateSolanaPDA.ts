import { PublicKey, Connection } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';

/**
 * Script to calculate a Solana Program Derived Address (PDA) for CCIP TokenPool Configuration
 * 
 * This script demonstrates how to derive the PDA that stores the configuration for a 
 * Solana CCIP TokenPool program.
 */

/**
 * Converts a Solana address from base58 to hex format
 * 
 * @param address - The Solana address in base58 format
 * @returns The address as a hex string prefixed with 0x
 */
function convertSolanaAddressToHex(address: string): string {
  const bytes = bs58.decode(address);
  return "0x" + Buffer.from(bytes).toString("hex");
}

// Hardcoded values (replace as needed)
const mintAddressStr = 'AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj'; // Token mint address
const poolProgramStr = '787uwTCd8b2ikQP6g9AapMky36PWDv9x1XpC5ZUAfDYc'; // The pool program ID

// Convert string addresses to PublicKey objects
const mint = new PublicKey(mintAddressStr);
const pool_program = new PublicKey(poolProgramStr);

console.log('=== PDA Calculation Parameters ===');
console.log(`Mint Address: ${mintAddressStr}`);
console.log(`Mint Address (hex): ${convertSolanaAddressToHex(mintAddressStr)}`);
console.log(`Pool Program ID: ${poolProgramStr}`);
console.log(`Pool Program ID (hex): ${convertSolanaAddressToHex(poolProgramStr)}`);
console.log('\nCalculating TokenPool Config PDA...\n');

// Calculate the PDA using the provided formula
function calculatePoolConfigPda() {
  // Find the PDA using the seeds
  const [pool_config, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ccip_tokenpool_config"),
      mint.toBuffer()
    ],
    pool_program
  );
  
  return { pool_config, bump };
}

// Calculate and log the result
try {
  const { pool_config, bump } = calculatePoolConfigPda();
  const poolConfigAddress = pool_config.toString();
  const poolConfigHex = convertSolanaAddressToHex(poolConfigAddress);
  
  console.log('=== PDA Calculation Result ===');
  console.log(`Pool Config PDA: ${poolConfigAddress}`);
  console.log(`Pool Config PDA (hex): ${poolConfigHex}`);
  console.log(`Bump Seed: ${bump}`);
  
  // Additional information
  console.log('\n=== PDA Components ===');
  console.log(`Seeds:`);
  console.log(`  1. "ccip_tokenpool_config" (string)`);
  console.log(`  2. ${mintAddressStr} (mint public key)`);
  console.log(`Program ID: ${poolProgramStr}`);
  
  // Verification instructions
  console.log('\n=== Verification ===');
  console.log('To verify this PDA on-chain:');
  console.log(`1. Use the Solana CLI: solana account ${poolConfigAddress}`);
  console.log('2. Or check in Solana Explorer by searching for the address');
  console.log('3. For interoperability with EVM chains, use the hex representation:');
  console.log(`   ${poolConfigHex}`);
  
} catch (error) {
  console.error('Error calculating PDA:');
  console.error(error);
}

// Export the calculation function and conversion function for potential reuse
export { calculatePoolConfigPda, convertSolanaAddressToHex }; 