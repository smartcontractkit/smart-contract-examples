#!/bin/bash

# Navigate to the project directory (adjust if needed)
cd "$(dirname "$0")/.."

# Check if required Solana packages are installed
if ! npm list @solana/web3.js >/dev/null 2>&1; then
  echo "Installing required dependency: @solana/web3.js"
  npm install --save-dev @solana/web3.js
fi

if ! npm list bn.js >/dev/null 2>&1; then
  echo "Installing required dependency: bn.js"
  npm install --save-dev bn.js
fi

# Run the TypeScript file using ts-node
echo "Running Solana PDA calculation script..."
npx ts-node scripts/calculateSolanaPDA.ts

echo ""
echo "Calculation complete!" 