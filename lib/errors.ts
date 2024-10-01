import type { TokenObj } from "./structs.ts";

/**
 * Is raised when an invalid type is encountered during the evaluation process.
 */
export class InvalidTypeError extends Error {
  constructor(message: string) {
    const msg = `[invalid-type] ${message}`;
    super(msg);
    this.name = "InvalidTypeError";
  }
}

/**
 * Is raised when an invalid value is encountered during the evaluation process.
 */
export class InvalidValueError extends Error {
  constructor(message: string) {
    const msg = `[invalid-value] ${message}`;
    super(msg);
    this.name = "InvalidValueError";
  }
}

/**
 * Is raised when an unknown function is encountered during the evaluation process.
 */
export class UnknownFunctionError extends Error {
  constructor(message: string) {
    const msg = `[unknown-function] ${message}`;
    super(msg);
    this.name = "UnknownFunctionError";
  }
}

/**
 * Is raised when an invalid number of function arguments is encountered during the evaluation process.
 */
export class InvalidArityError extends Error {
  constructor(message: string) {
    const msg = `[invalid-arity] ${message}`;
    super(msg);
    this.name = "InvalidArityError";
  }
}

/**
 * Is raised when an invalid number of function arguments is encountered during the evaluation process.
 */
export class InvalidSyntaxError extends Error {
  constructor(message: string) {
    const msg = `[syntax] ${message}`;
    super(msg);
    this.name = "InvalidSyntaxError";
  }
}

export const fError = {
  invalidToken: (token: TokenObj) =>
    `Invalid token '${token.type}'(${token.value})`,
  unexpectedToken: (token: TokenObj) =>
    `Unexpected token '${token.type}'(${token.value})`,
  expectedValue: (expected: string, actual: string) =>
    `Expected ${expected}, got: ${actual}`,
  expectedAguments: (
    name: string,
    lengthExpected: number,
    lengthActual: number,
  ) =>
    `ArgumentError: ${name}() takes at least ${lengthExpected} argument(s) but received ${lengthActual},`,
} as const;

export const ErrorCodeToErrorMap: Record<
  string,
  // deno-lint-ignore no-explicit-any
  new (...args: any[]) => Error
> = {
  "invalid-type": InvalidTypeError,
  "invalid-value": InvalidValueError,
  "unknown-function": UnknownFunctionError,
  "invalid-arity": InvalidArityError,
} as const;
