"use strict"
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.SandboxError = exports.Sandbox = void 0
const fs_1 = __importDefault(require("fs"))
const os_1 = __importDefault(require("os"))
const path_1 = __importDefault(require("path"))
const vm2_1 = require("vm2")
const Functions_1 = require("./Functions")
class Sandbox {
  constructor(disableTmpClearing, enableSandboxedLogging) {
    this.disableTmpClearing = disableTmpClearing
    this.enableSandboxedLogging = enableSandboxedLogging
  }
  async evaluate(numAllowedQueries, javascriptString, args, secrets) {
    const functionsModule = new Functions_1.FunctionsModule()
    const Functions = functionsModule.buildFunctionsmodule(numAllowedQueries)
    // Clear the tmp directory before running the untrusted code to ensure
    // it does not have access to any cached data from the previously run script
    // in the case that the previous script exited prematurely.
    this.clearTmpDirectory()
    const vm = new vm2_1.NodeVM({
      sandbox: { args, secrets, Functions },
      console: `${this.enableSandboxedLogging ? "inherit" : "off"}`,
      eval: false,
      wasm: false,
      require: {
        builtin: ["buffer", "crypto", "querystring", "string_decoder", "url", "util"],
      },
    })
    let functionScript
    // Try to compile the provided JavaScript code.
    try {
      functionScript = new vm2_1.VMScript("module.exports = async function () {\n" + javascriptString + "\n}").compile()
    } catch (untypedError) {
      const error = untypedError
      throw new SandboxError(error.name, error.message, error.stack)
    }
    if (this.enableSandboxedLogging) {
      console.log("\n__Console log messages from sandboxed code__")
    }
    // Try to run the provided JavaScript code.
    let sandboxedFunction
    let result
    try {
      sandboxedFunction = await vm.run(functionScript)
      result = await sandboxedFunction()
    } catch (untypedError) {
      const error = untypedError
      throw new SandboxError(error.name, error.message, error.stack, functionsModule.userHttpQueries)
    }
    // Clear the tmp directory after running the code to ensure it does not
    // leave any cached data on the FaaS instance.
    this.clearTmpDirectory()
    return { result, userHttpQueries: functionsModule.userHttpQueries }
  }
  clearTmpDirectory() {
    if (this.disableTmpClearing) {
      return
    }
    fs_1.default.readdirSync(os_1.default.tmpdir()).forEach((dirent) => {
      try {
        fs_1.default.rmSync(path_1.default.join(os_1.default.tmpdir(), dirent), { recursive: true })
      } catch {}
    })
  }
}
exports.Sandbox = Sandbox
class SandboxError {
  constructor(name, message, details, userHttpQueries) {
    this.name = name
    this.message = message
    this.details = details
    this.userHttpQueries = userHttpQueries
  }
}
exports.SandboxError = SandboxError
