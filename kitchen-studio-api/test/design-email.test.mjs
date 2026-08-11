import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("design delivery keeps the manager-first safety contract", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.match(source, /image\.size > 8_000_000/);
  assert.match(source, /Idempotency-Key/);
  assert.ok(source.indexOf("const manager = await sendEmail") < source.indexOf("const customer = await sendEmail"));
  assert.match(source, /leadNotified: true, customerEmailed: customer\.ok/);
});
