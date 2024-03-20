export * from "./env";
export * from "./router";
export * from "./offramp";

// override console.log to disable ethersjs warning when there are duplicates in ABI

const oldLog = console.log;

const log = (...args: any[]) => {
  const msg = args.length > 0 ? args[0] : "";

  if (/Duplicate definition of/.test(msg)) {
    return;
  }

  oldLog(...args); // This will pass all the arguments to the original console.log function
};

console.log = log;
