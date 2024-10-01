import { assertThrows } from "@std/assert";
import { Parser } from "./parser.ts";
import { TreeInterpreter } from "./tree-interpreter.ts";
import { InvalidTypeError } from "./errors.ts";

Deno.test(
  "TreeInterpreter > should throw a readable error when invalid arguments are provided to a function",
  () => {
    const parser = new Parser("length(`null`)");
    const interpreter = new TreeInterpreter([]);
    assertThrows(
      () => {
        interpreter.search(parser);
      },
      InvalidTypeError,
      "[invalid-type] Expected length() argument 1 to be type string,array,object, got: null",
    );
  },
);
