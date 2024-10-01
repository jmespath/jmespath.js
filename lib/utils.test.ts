import { assert, assertFalse } from "@std/assert";
import { isAlpha, isAlphaNum, isFalsy, isNum } from "./utils.ts";

Deno.test("isAlpha", () => {
  assert(isAlpha("a"));
  assert(isAlpha("m"));
  assert(isAlpha("z"));
  assert(isAlpha("A"));
  assert(isAlpha("M"));
  assert(isAlpha("Z"));
  assert(isAlpha("_"));
  assertFalse(isAlpha("-"));
  assertFalse(isAlpha("?"));
  assertFalse(isAlpha("@"));
  assertFalse(isAlpha("["));
  assertFalse(isAlpha("{"));
});

Deno.test("isNum", () => {
  assert(isNum("0"));
  assert(isNum("5"));
  assert(isNum("9"));
  assert(isNum("-"));
  assertFalse(isNum("/"));
  assertFalse(isNum("_"));
  assertFalse(isNum(":"));
});

Deno.test("isAlphaNum", () => {
  assert(isAlphaNum("0"));
  assert(isAlphaNum("5"));
  assert(isAlphaNum("9"));
  assertFalse(isAlphaNum("-"));
  assertFalse(isAlphaNum("/"));
  assertFalse(isAlphaNum(":"));

  assert(isAlphaNum("a"));
  assert(isAlphaNum("m"));
  assert(isAlphaNum("z"));
  assert(isAlphaNum("A"));
  assert(isAlphaNum("M"));
  assert(isAlphaNum("Z"));
  assert(isAlphaNum("_"));
  assertFalse(isAlphaNum("?"));
  assertFalse(isAlphaNum("@"));
  assertFalse(isAlphaNum("["));
  assertFalse(isAlphaNum("{"));
});

Deno.test("isFalsy", () => {
  assert(isFalsy(""));
  assert(isFalsy(false));
  assert(isFalsy(null));
  assert(isFalsy(undefined));
  assert(isFalsy([]));
  assert(isFalsy({}));

  assertFalse(isFalsy("a"));
  assertFalse(isFalsy("false"));
  assertFalse(isFalsy(true));
  assertFalse(isFalsy([0]));
  assertFalse(isFalsy({ 0: 1 }));
});
