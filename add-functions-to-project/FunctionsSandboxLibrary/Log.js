"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
exports.Log = void 0
class Log {}
exports.Log = Log
Log.error = (message, requestId) =>
  console.log(
    JSON.stringify({
      logLevel: "error",
      timestamp: Date.now(),
      message,
      requestId,
    })
  )
Log.warn = (message, requestId) =>
  console.log(
    JSON.stringify({
      logLevel: "warn",
      timestamp: Date.now(),
      message,
      requestId,
    })
  )
Log.info = (message, requestId) => {
  if (process.env["LOG_LEVEL"] && process.env["LOG_LEVEL"]?.toLowerCase() !== "false") {
    console.log(
      JSON.stringify({
        logLevel: "info",
        timestamp: Date.now(),
        message,
        requestId,
      })
    )
  }
}
Log.debug = (message, requestId) => {
  if (process.env["LOG_LEVEL"]?.toLowerCase() === "debug" || process.env["LOG_LEVEL"]?.toLowerCase() === "trace") {
    console.log(
      JSON.stringify({
        logLevel: "debug",
        timestamp: Date.now(),
        message,
        requestId,
      })
    )
  }
}
Log.trace = (message, requestId) => {
  if (process.env["LOG_LEVEL"]?.toLowerCase() === "trace") {
    console.log(
      JSON.stringify({
        logLevel: "trace",
        timestamp: Date.now(),
        message,
        requestId,
      })
    )
  }
}
