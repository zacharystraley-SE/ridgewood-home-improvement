import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 14) {
  console.error("Usage: node scripts/hash-password.mjs 'a password of at least 14 characters'");
  process.exit(1);
}

// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 iterations.
const iterations = 100_000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
console.log(`${iterations}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
