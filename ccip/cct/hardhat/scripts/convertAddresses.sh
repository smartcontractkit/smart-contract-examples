#!/bin/bash

# Navigate to the project directory (adjust if needed)
cd "$(dirname "$0")/.."

# Run the TypeScript file using ts-node
echo "Running Solana address conversion script..."
npx ts-node scripts/hexToSolanaAddress.ts

echo ""
echo "Conversion complete!" 