import { assert, assertFalse, assertThrows } from "@std/assert";
import { TreeInterpreter } from "./tree-interpreter.ts";
import { InvalidArityError } from "./errors.ts";

Deno.test("Runtime > call not_null", () => {
  const t = new TreeInterpreter({});
  assert(t.runtime.callFunction("not_null", ["null"]));
  assertFalse(t.runtime.callFunction("not_null", [null]));
  assertThrows(
    () => {
      t.runtime.callFunction("not_null", []);
    },
    InvalidArityError,
    "[invalid-arity] ArgumentError: not_null() takes at least 1 argument(s) but received 0",
  );
});
