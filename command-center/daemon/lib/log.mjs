// Tiny stderr logger. ISO timestamps. No deps.

function ts() { return new Date().toISOString(); }

function fmt(level, args) {
  return `[${ts()}] [${level}] ` + args.map(a =>
    typeof a === "string" ? a : JSON.stringify(a)
  ).join(" ");
}

export const log = {
  info:  (...a) => process.stderr.write(fmt("info",  a) + "\n"),
  warn:  (...a) => process.stderr.write(fmt("warn",  a) + "\n"),
  error: (...a) => process.stderr.write(fmt("error", a) + "\n"),
  boot:  (...a) => process.stderr.write(fmt("boot",  a) + "\n"),
};
