import { assertEquals, assertThrows } from "@std/assert";
import { Lexer } from "./lexer.ts";
import type { TokenObj } from "./structs.ts";
import { InvalidValueError } from "./errors.ts";

Deno.test("Lexer > single_expr", () => {
  const expected: TokenObj[] = [
    {
      start: 0,
      type: "UnquotedIdentifier",
      value: "foo",
    },
  ];
  const l = new Lexer("foo");
  assertEquals(l.tokenize(), expected);
});

Deno.test("Lexer > single_subexpr", () => {
  const expected: TokenObj[] = [
    {
      start: 0,
      type: "UnquotedIdentifier",
      value: "foo",
    },
    {
      start: 3,
      type: "Dot",
      value: ".",
    },
    {
      start: 4,
      type: "UnquotedIdentifier",
      value: "bar",
    },
  ];
  const l = new Lexer("foo.bar");
  assertEquals(l.tokenize(), expected);
});

Deno.test("Lexer > should tokenize unquoted identifier with underscore", () => {
  const expected: TokenObj[] = [
    {
      type: "UnquotedIdentifier",
      value: "_underscore",
      start: 0,
    },
  ];
  const l = new Lexer("_underscore");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize unquoted identifier with numbers", () => {
  const expected: TokenObj[] = [
    {
      type: "UnquotedIdentifier",
      value: "foo123",
      start: 0,
    },
  ];
  const l = new Lexer("foo123");
  assertEquals(l.tokenize(), expected);
});

Deno.test("Lexer > should tokenize numbers", () => {
  const expected: TokenObj[] = [
    { type: "UnquotedIdentifier", value: "foo", start: 0 },
    { type: "Lbracket", value: "[", start: 3 },
    { type: "Number", value: 0, start: 4 },
    { type: "Rbracket", value: "]", start: 5 },
  ];
  const l = new Lexer("foo[0]");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize numbers with multiple digits", () => {
  const expected: TokenObj[] = [
    { type: "Number", value: 12345, start: 0 },
  ];
  const l = new Lexer("12345");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize negative numbers", () => {
  const expected: TokenObj[] = [
    { type: "Number", value: -12345, start: 0 },
  ];
  const l = new Lexer("-12345");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize quoted identifier", () => {
  const expected: TokenObj[] = [
    {
      type: "QuotedIdentifier",
      value: "foo",
      start: 0,
    },
  ];
  const l = new Lexer('"foo"');
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize quoted identifier with unicode escape", () => {
  const expected: TokenObj[] = [
    {
      type: "QuotedIdentifier",
      value: "✓",
      start: 0,
    },
  ];
  const l = new Lexer('"\\u2713"');
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize literal lists", () => {
  const expected: TokenObj[] = [
    {
      type: "Literal",
      value: [0, 1],
      start: 0,
    },
  ];
  const l = new Lexer("`[0, 1]`");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize literal dict", () => {
  const expected: TokenObj[] = [
    {
      type: "Literal",
      value: { "foo": "bar" },
      start: 0,
    },
  ];
  const l = new Lexer('`{"foo": "bar"}`');
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize literal strings", () => {
  const expected: TokenObj[] = [
    {
      type: "Literal",
      value: "foo",
      start: 0,
    },
  ];
  const l = new Lexer('`"foo"`');
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize json literals", () => {
  const expected: TokenObj[] = [
    {
      type: "Literal",
      value: true,
      start: 0,
    },
  ];
  const l = new Lexer("`true`");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should not requiring surrounding quotes for strings", () => {
  const expected: TokenObj[] = [
    {
      type: "Literal",
      value: "foo",
      start: 0,
    },
  ];
  const l = new Lexer("`foo`");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should not requiring surrounding quotes for numbers", () => {
  const expected: TokenObj[] = [
    {
      type: "Literal",
      value: 20,
      start: 0,
    },
  ];
  const l = new Lexer("`20`");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize literal lists with chars afterwards", () => {
  const expected: TokenObj[] = [
    { type: "Literal", value: [0, 1], start: 0 },
    { type: "Lbracket", value: "[", start: 8 },
    { type: "Number", value: 0, start: 9 },
    { type: "Rbracket", value: "]", start: 10 },
  ];
  const l = new Lexer("`[0, 1]`[0]");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize two char tokens with shared prefix", () => {
  const expected: TokenObj[] = [
    { type: "Filter", value: "[?", start: 0 },
    { type: "UnquotedIdentifier", value: "foo", start: 2 },
    { type: "Rbracket", value: "]", start: 5 },
  ];
  const l = new Lexer("[?foo]");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize flatten operator", () => {
  const expected: TokenObj[] = [
    { type: "Flatten", value: "[]", start: 0 },
  ];
  const l = new Lexer("[]");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize comparators", () => {
  const expected: TokenObj[] = [
    { type: "LT", value: "<", start: 0 },
  ];
  const l = new Lexer("<");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize two char tokens without shared prefix", () => {
  const expected: TokenObj[] = [
    { type: "EQ", value: "==", start: 0 },
  ];
  const l = new Lexer("==");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize not equals", () => {
  const expected: TokenObj[] = [
    { type: "NE", value: "!=", start: 0 },
  ];
  const l = new Lexer("!=");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize the OR token", () => {
  const expected: TokenObj[] = [
    { type: "UnquotedIdentifier", value: "a", start: 0 },
    { type: "Or", value: "||", start: 1 },
    { type: "UnquotedIdentifier", value: "b", start: 3 },
  ];
  const l = new Lexer("a||b");
  assertEquals(l.tokenize(), expected);
});
Deno.test("Lexer > should tokenize function calls", () => {
  const expected: TokenObj[] = [
    { type: "UnquotedIdentifier", value: "abs", start: 0 },
    { type: "Lparen", value: "(", start: 3 },
    { type: "Current", value: "@", start: 4 },
    { type: "Rparen", value: ")", start: 5 },
  ];
  const l = new Lexer("abs(@)");
  assertEquals(l.tokenize(), expected);
});

Deno.test("Lexer > index", () => {
  const expected: TokenObj[] = [
    {
      start: 0,
      type: "Lbracket",
      value: "[",
    },
    {
      start: 1,
      type: "Number",
      value: 1,
    },
    {
      start: 2,
      type: "Rbracket",
      value: "]",
    },
    {
      start: 3,
      type: "Lbracket",
      value: "[",
    },
    {
      start: 4,
      type: "Number",
      value: 0,
    },
    {
      start: 5,
      type: "Rbracket",
      value: "]",
    },
  ];
  const l = new Lexer(
    "[1][0]",
  );
  assertEquals(l.tokenize(), expected);
});

Deno.test("Lexer > all paths", () => {
  const expected: TokenObj[] = [
    {
      start: 0,
      type: "UnquotedIdentifier",
      value: "f",
    },
    {
      start: 1,
      type: "Lbracket",
      value: "[",
    },
    {
      start: 2,
      type: "Number",
      value: 1,
    },
    {
      start: 3,
      type: "Rbracket",
      value: "]",
    },
    {
      start: 4,
      type: "QuotedIdentifier",
      value: "a",
    },
    {
      start: 7,
      type: "Literal",
      value: "b",
    },
    {
      start: 10,
      type: "Literal",
      value: "c",
    },
    {
      start: 13,
      type: "And",
      value: "&&",
    },
    {
      start: 15,
      type: "LT",
      value: "<",
    },
    {
      start: 16,
      type: "Pipe",
      value: "|",
    },
    {
      start: 17,
      type: "UnquotedIdentifier",
      value: "a",
    },
    {
      start: 18,
      type: "Expref",
      value: "&",
    },
    {
      start: 19,
      type: "Or",
      value: "||",
    },
  ];
  const l = new Lexer("f[1]\"a\"'b'`c`&&<|a&||");
  assertEquals(l.tokenize(), expected);
});

Deno.test("Lexer > throws", () => {
  const l = new Lexer("%");
  assertThrows(
    () => {
      l.tokenize();
    },
    InvalidValueError,
    "[invalid-value] Unknown character: '%'",
  );
});
