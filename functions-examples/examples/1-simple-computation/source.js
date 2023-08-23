// calculate geometric mean off-chain by a DON then return the result
// valures provided in args array

console.log(`calculate geometric mean of ${args}`);

// make sure arguments are provided
if (!args || args.length === 0) throw new Error("input not provided");

const product = args.reduce((accumulator, currentValue) => {
  const numValue = parseInt(currentValue);
  if (isNaN(numValue)) throw Error(`${currentValue} is not a number`);
  return accumulator * numValue;
}, 1); // calculate the product of numbers provided in args array

const geometricMean = Math.pow(product, 1 / args.length); // geometric mean = length-root of (product)
console.log(`geometric mean is: ${geometricMean.toFixed(2)}`);

// Decimals are not handled in Solidity so multiply by 100 (for 2 decimals) and round to the nearest integer
// Functions.encodeUint256: Return a buffer from uint256
return Functions.encodeUint256(Math.round(geometricMean * 100));
