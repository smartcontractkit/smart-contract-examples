const ora = require("ora")

function spin(config = {}) {
  const spinner = ora({ spinner: "dots2", ...config })
  spinner.start()
  return spinner
}

module.exports = {
  spin,
}
