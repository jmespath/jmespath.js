import type { JSONObject } from "./structs.ts";
import { InvalidTypeError } from "./errors.ts";

/**
 * Checks if a value is an object
 */
export function isObject(obj: unknown): obj is JSONObject {
  return typeof obj === "object" && !Array.isArray(obj) && obj !== null;
}

/**
 * Checking if character is an alfabetic character or an underscore
 */
export function isAlpha(ch: string): boolean {
  return (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    ch === "_";
}

/**
 * Checking if character is a numeric character or an dash
 */
export function isNum(ch: string): boolean {
  return (ch >= "0" && ch <= "9") ||
    ch === "-";
}

/**
 * Checking if character is an alfanumeric character or an underscore
 */
export function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) ||
    (ch >= "0" && ch <= "9");
}

/**
 * Checks if the value is falsy
 *
 * From the spec:
 * A false value corresponds to the following values:
 * - Empty list
 * - Empty object
 * - Empty string
 * - False boolean
 * - null value
 */
export function isFalsy(obj: unknown): boolean {
  // First check the scalar values.
  if (
    obj === "" || obj === false || obj === null || obj === undefined
  ) {
    return true;
  } else if (Array.isArray(obj)) {
    // Check for an empty array.
    return obj.length < 1;
  } else if (isObject(obj)) {
    // Check for an empty object.
    return Object.keys(obj).length < 1;
  } else {
    return false;
  }
}

// deno-lint-ignore no-explicit-any
export function assertIsArray(value: unknown): asserts value is any[] {
  if (!Array.isArray(value)) {
    throw new InvalidTypeError(`Value is not array, but '${typeof value}'`);
  }
}
