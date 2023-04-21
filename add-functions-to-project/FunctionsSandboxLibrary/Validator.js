"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
exports.Validator = void 0
class Validator {
  constructor(defaultMaxResponseBytes, defaultMaxHttpQueries) {
    this.defaultMaxResponseBytes = defaultMaxResponseBytes
    this.defaultMaxHttpQueries = defaultMaxHttpQueries
    this.isValidInput = (input) => {
      const validInput = input
      if (typeof validInput.source !== "string") {
        throw Error("source param is missing")
      }
      if (validInput.requestId && typeof validInput.requestId !== "string") {
        throw Error("requestId param not a string or number")
      }
      if (validInput.numAllowedQueries) {
        if (typeof validInput.numAllowedQueries !== "number" || !Number.isInteger(validInput.numAllowedQueries)) {
          throw Error("numAllowedQueries not integer")
        }
      } else {
        validInput.numAllowedQueries = this.defaultMaxHttpQueries
      }
      if (validInput.args) {
        if (!Array.isArray(validInput.args)) {
          throw Error("args param not an array")
        }
        for (const arg of validInput.args) {
          if (typeof arg !== "string") {
            throw Error("args param not a string array")
          }
        }
      }
      if (
        validInput.secrets &&
        (typeof validInput.secrets !== "object" ||
          !Object.values(validInput.secrets).every((s) => {
            return typeof s === "string"
          }))
      ) {
        throw Error("secrets param not a string map")
      }
      this.maxResponseBytes = this.defaultMaxResponseBytes
      if (validInput.maxResponseBytes) {
        if (typeof validInput.maxResponseBytes !== "number" || !Number.isInteger(validInput.maxResponseBytes)) {
          throw Error("maxResponseBytes not integer")
        }
        this.maxResponseBytes = validInput.maxResponseBytes
      }
      return true
    }
    this.getValidOutput = (sandboxOutput) => {
      if (Buffer.isBuffer(sandboxOutput.result)) {
        if (sandboxOutput.result.length <= this.maxResponseBytes) {
          return sandboxOutput.result
        }
        throw Error(`returned Buffer >${this.maxResponseBytes} bytes`)
      }
      throw Error("returned value not a Buffer")
    }
    this.encodeResponse = (result) => {
      if (result.length === 0) {
        return "0x0"
      }
      return "0x" + result.toString("hex")
    }
    this.maxResponseBytes = defaultMaxResponseBytes
  }
}
exports.Validator = Validator
