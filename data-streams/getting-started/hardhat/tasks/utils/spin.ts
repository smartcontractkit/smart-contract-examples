import ora from "ora";

export function spin(config = {}) {
  const spinner = ora({ spinner: "dots2", ...config });
  spinner.start();
  return spinner;
}
