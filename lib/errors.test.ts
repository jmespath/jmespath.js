import { assertThrows } from "@std/assert";
import {
  InvalidArityError,
  InvalidTypeError,
  InvalidValueError,
  UnknownFunctionError,
} from "./errors.ts";

Deno.test("InvalidTypeError > throws", () => {
  assertThrows(
    () => {
      throw new InvalidTypeError("test");
    },
    InvalidTypeError,
    "[invalid-type] test",
  );
});

Deno.test("InvalidValueError > throws", () => {
  assertThrows(
    () => {
      throw new InvalidValueError("test");
    },
    InvalidValueError,
    "[invalid-value] test",
  );
});

Deno.test("UnknownFunctionError > throws", () => {
  assertThrows(
    () => {
      throw new UnknownFunctionError("test");
    },
    UnknownFunctionError,
    "[unknown-function] test",
  );
});

Deno.test("InvalidArityError > throws", () => {
  assertThrows(
    () => {
      throw new InvalidArityError("test");
    },
    InvalidArityError,
    "[invalid-arity] test",
  );
});
