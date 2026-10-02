import { test } from "node:test";
import assert from "node:assert/strict";
import {
  identifierFromName,
  identifierError,
  suggestIdentifier,
} from "./identity.ts";

test("generation is deterministic and normalizes ordinary names without changing the name", () => {
  const cases = [
    ["Production API", "production-api"],
    ["  Café Déjà Vu!  ", "cafe-deja-vu"],
    ["Team’s API / EU_West", "teams-api-eu-west"],
    ["東京 🚀", ""],
    ["___", ""],
    ["2026 Release", "2026-release"],
    ["A".repeat(80), "a".repeat(63)],
  ];
  for (const [name, expected] of cases)
    assert.equal(identifierFromName(name), expected);
});

test("manual identifiers require exact valid spelling rather than silently rewriting it", () => {
  for (const id of ["api", "a", "2026", "prod_api-v2"])
    assert.equal(identifierError(id), undefined);
  for (const id of [
    "",
    "Upper",
    "a b",
    "a/b",
    "a.b",
    "-api",
    "api_",
    "a".repeat(64),
    "東京",
  ])
    assert.ok(identifierError(id), id);
});

test("collision suggestions honor the length limit and existing suffixes", () => {
  assert.equal(suggestIdentifier("api", ["api", "api-2"]), "api-3");
  const long = "a".repeat(63);
  const suggestion = suggestIdentifier(long, [long]);
  assert.equal(suggestion.length, 63);
  assert.equal(identifierError(suggestion), undefined);
});
