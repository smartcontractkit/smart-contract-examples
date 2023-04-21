"use strict"
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.getRequestConfig = exports.Location_ = void 0
const is_http_url_1 = __importDefault(require("is-http-url"))
var Location_
;(function (Location_) {
  Location_[(Location_["Inline"] = 0)] = "Inline"
  Location_[(Location_["Remote"] = 1)] = "Remote"
})((Location_ = exports.Location_ || (exports.Location_ = {})))
var CodeLanguage
;(function (CodeLanguage) {
  CodeLanguage[(CodeLanguage["JavaScript"] = 0)] = "JavaScript"
})(CodeLanguage || (CodeLanguage = {}))
const getRequestConfig = (unvalidatedConfig) => {
  const config = unvalidatedConfig
  if (config.codeLocation !== Location_.Inline) {
    throw Error(`codeLocation is not correctly specified in config`)
  }
  if (config.codeLanguage !== CodeLanguage.JavaScript) {
    throw Error(`codeLanguage is not correctly specified in config`)
  }
  if (typeof config.source !== "string") {
    throw Error(`source is not correctly specified in config`)
  }
  if (config.numAllowedQueries) {
    if (typeof config.numAllowedQueries !== "number" || !Number.isInteger(config.numAllowedQueries)) {
      throw Error(`numAllowedQueries is not correctly specified in config`)
    }
  }
  if (config.secrets) {
    if (typeof config.secrets !== "object") {
      throw Error("secrets object is not correctly specified in config")
    }
    for (const secret in config.secrets) {
      if (typeof config.secrets[secret] !== "string") {
        throw Error("Secrets object is not correctly specified in config. It can only contain string values.")
      }
    }
  }
  if (config.secretsURLs && config.secretsURLs.length > 0) {
    if (!Array.isArray(config.secretsURLs)) {
      throw Error("secretsURLs array is not correctly specified in config")
    }
    config.secretsURLs.forEach((s) => {
      if (!(0, is_http_url_1.default)(s)) {
        throw Error(`invalid HTTP or HTTPs URL ${s} in secretsURLs specified in config`)
      }
    })
    if (typeof config.walletPrivateKey !== "string") {
      throw Error(`walletPrivateKey is not correctly specified in config`)
    }
    if (config.DONPublicKey && typeof config.DONPublicKey !== "string") {
      throw Error(`DONPublicKey is not correctly specified in config`)
    }
  }
  if (config.args) {
    if (!Array.isArray(config.args)) throw Error(`args array is not correctly specified in config`)
    for (const arg of config.args) {
      if (typeof arg !== "string") {
        throw Error(`an element of the args array is not a string in config`)
      }
    }
  }
  if (config.maxResponseBytes) {
    if (typeof config.maxResponseBytes !== "number" || !Number.isInteger(config.maxResponseBytes)) {
      throw Error(`maxResponseBytes is not correctly specified in config`)
    }
  }
  if (config.expectedReturnType) {
    if (typeof config.expectedReturnType !== "string") {
      throw Error(`expectedReturnType is not correctly specified in config`)
    }
    switch (config.expectedReturnType) {
      case "uint256":
      case "int256":
      case "string":
      case "Buffer":
        break
      default:
        throw Error(`expectedReturnType is not correctly specified in config`)
    }
  }
  return config
}
exports.getRequestConfig = getRequestConfig
