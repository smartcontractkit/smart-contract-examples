"use strict"
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.encrypt = exports.encryptWithSignature = void 0
const eth_crypto_1 = __importDefault(require("eth-crypto"))
const encryptWithSignature = async (signerPrivateKey, readerPublicKey, message) => {
  const signature = eth_crypto_1.default.sign(signerPrivateKey, eth_crypto_1.default.hash.keccak256(message))
  const payload = {
    message,
    signature,
  }
  return await (0, exports.encrypt)(readerPublicKey, JSON.stringify(payload))
}
exports.encryptWithSignature = encryptWithSignature
const encrypt = async (readerPublicKey, message) => {
  const encrypted = await eth_crypto_1.default.encryptWithPublicKey(readerPublicKey, message)
  return eth_crypto_1.default.cipher.stringify(encrypted)
}
exports.encrypt = encrypt
