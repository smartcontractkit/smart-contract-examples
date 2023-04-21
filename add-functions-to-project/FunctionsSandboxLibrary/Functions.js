"use strict"
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
var _a
Object.defineProperty(exports, "__esModule", { value: true })
exports.FunctionsModule = void 0
const axios_1 = __importDefault(require("axios"))
class FunctionsModule {
  constructor() {
    this.buildFunctionsmodule = (numAllowedQueries) => {
      return {
        makeHttpRequest: this.makeHttpRequestFactory(numAllowedQueries),
        encodeUint256: FunctionsModule.encodeUint256,
        encodeInt256: FunctionsModule.encodeInt256,
        encodeString: FunctionsModule.encodeString,
      }
    }
    this.makeHttpRequestFactory = (maxHttpRequests) => {
      let totalHttpRequests = 0
      return async ({
        url,
        method = "get",
        params,
        headers,
        data,
        // Default timeout of 5 seconds
        timeout = 5000,
        responseType = "json",
      }) => {
        if (totalHttpRequests < maxHttpRequests) {
          totalHttpRequests++
          let result
          if (timeout > 9000) {
            throw Error("HTTP request timeout >9000")
          }
          if (url.length > 2048) {
            throw Error("HTTP request URL length >2048")
          }
          try {
            result = await (0, axios_1.default)({
              method: method.toLowerCase(),
              url,
              params,
              headers,
              data,
              timeout,
              responseType,
              maxBodyLength: 2000,
              maxContentLength: 2000000, // Max response size: 2 megabytes
            })
            // Delete the request to avoid exposing system information to the user's code
            delete result.request
            delete result.config
            result.error = false
            return result
          } catch (untypedError) {
            const error = untypedError
            delete error.request
            delete error.config
            if (error.response) {
              delete error.response.request
            }
            error.error = true
            return error
          }
        }
        throw Error("exceeded numAllowedQueries")
      }
    }
  }
  get userHttpQueries() {
    return []
  }
}
exports.FunctionsModule = FunctionsModule
_a = FunctionsModule
FunctionsModule.encodeUint256 = (result) => {
  if (typeof result === "number") {
    if (!Number.isInteger(result)) {
      throw Error("encodeUint256 invalid input")
    }
    if (result < 0) {
      throw Error("encodeUint256 invalid input")
    }
    return _a.encodeUint256(BigInt(result))
  }
  if (typeof result === "bigint") {
    if (result > _a.maxUint256) {
      throw Error("encodeUint256 invalid input")
    }
    if (result < BigInt(0)) {
      throw Error("encodeUint256 invalid input")
    }
    if (result === BigInt(0)) {
      return Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex")
    }
    const hex = result.toString(16).padStart(64, "0")
    return Buffer.from(hex, "hex")
  }
  throw Error("encodeUint256 invalid input")
}
FunctionsModule.encodeInt256 = (result) => {
  if (typeof result === "number") {
    if (!Number.isInteger(result)) {
      throw Error("encodeInt256 invalid input")
    }
    return _a.encodeInt256(BigInt(result))
  }
  if (typeof result !== "bigint") {
    throw Error("encodeInt256 invalid input")
  }
  if (result < _a.maxNegInt256) {
    throw Error("encodeInt256 invalid input")
  }
  if (result > _a.maxPosInt256) {
    throw Error("encodeInt256 invalid input")
  }
  if (result < BigInt(0)) {
    return _a.encodeNegSignedInt(result)
  }
  return _a.encodePosSignedInt(result)
}
FunctionsModule.encodeString = (result) => {
  if (typeof result !== "string") {
    throw Error("encodeString invalid input")
  }
  return Buffer.from(result)
}
FunctionsModule.encodePosSignedInt = (int) => {
  const hex = int.toString(16).padStart(64, "0")
  return Buffer.from(hex, "hex")
}
FunctionsModule.encodeNegSignedInt = (int) => {
  const overflowingHex = (BigInt(2) ** BigInt(256) + int).toString(16)
  const int256Hex = overflowingHex.slice(-64)
  return Buffer.from(int256Hex, "hex")
}
FunctionsModule.maxUint256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935")
FunctionsModule.maxPosInt256 = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819967")
FunctionsModule.maxNegInt256 = BigInt("-57896044618658097711785492504343953926634992332820282019728792003956564819968")
