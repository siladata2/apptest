import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  console.error("Run this command in an interactive terminal; the password is intentionally not read from command-line arguments.");
  process.exit(1);
}

let password = "";
let finished = false;
process.stdout.write("Enter a new admin password (minimum 16 characters; input hidden): ");
process.stdin.setEncoding("utf8");
process.stdin.setRawMode(true);
process.stdin.resume();

function finish(cancelled = false) {
  if (finished) return;
  finished = true;
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdout.write("\n");
  if (cancelled) { process.exitCode = 1; return; }
  if (Array.from(password).length < 16) {
    console.error("Use at least 16 characters, then run the command again.");
    process.exitCode = 1;
    return;
  }
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  password = "";
  console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
  console.log("Store this value only in the hosting provider’s encrypted environment-variable settings.");
}

process.stdin.on("data", chunk => {
  for (const char of chunk) {
    if (char === "\u0003") { finish(true); return; }
    if (char === "\r" || char === "\n") { finish(); return; }
    if (char === "\u007f" || char === "\b") { password = Array.from(password).slice(0, -1).join(""); continue; }
    if (char >= " ") password += char;
  }
});
