// calculate geometric mean off-chain by a DON then return the result
// valures provided in args array

// imports
const { escape } = await import("https://deno.land/std/regexp/mod.ts");
const path = await import("node:path");
const lodash = await import("http://cdn.skypack.dev/lodash"); 

// create string arrays
const array1 = ["Hello", " "]
const array2 = ["World", "!"]

// concatenate arrays
const concatenatedArray = (lodash.concat(array1, array2));
console.log(`Concatenated array: ` + concatenatedArray);

// join arrays into a string
const joinedString = path.join(concatenatedArray[0], concatenatedArray[1], concatenatedArray[2], concatenatedArray[3]);
console.log(`Joined string: ` + concatenatedArray);

// escape string
const escapedString = escape(joinedString);
console.log(`Escaped string: ` + escapedString);

// return result
return Functions.encodeString(escapedString);
