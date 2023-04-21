"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
exports.buildRequest = void 0
const getRequestConfig_1 = require("./getRequestConfig")
const encryptSecrets_1 = require("./encryptSecrets")
const buildRequest = async (unvalidatedConfig) => {
  const config = (0, getRequestConfig_1.getRequestConfig)(unvalidatedConfig)
  const request = { source: config.source }
  if (config.secretsURLs && config.secretsURLs.length > 0) {
    request.secrets = "0x" + (await (0, encryptSecrets_1.encrypt)(config.DONPublicKey, config.secretsURLs.join(" ")))
  }
  if (config.args) {
    request.args = config.args
  }
  return request
}
exports.buildRequest = buildRequest
