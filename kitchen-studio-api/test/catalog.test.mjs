import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../schema.sql", import.meta.url), "utf8");

test("the initial catalog has four materials in each of six categories", () => {
  const rows = [...schema.matchAll(/^\('([^']+)','([^']+)'/gm)];
  assert.equal(rows.length, 24);
  for (const category of ["cabinetry", "island", "countertops", "backsplash", "flooring", "walls"]) {
    assert.equal(rows.filter((row) => row[2] === category).length, 4);
  }
});

test("D1 rejects an eleventh material in a category", () => {
  assert.match(schema, /materials_max_ten/);
  assert.match(schema, /COUNT\(\*\).*>= 10/s);
});

test("anonymous submissions have a persisted rate-limit table", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public_submission_limits/);
  assert.match(schema, /PRIMARY KEY \(ip, action\)/);
});
