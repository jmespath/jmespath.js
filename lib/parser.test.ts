import { assertEquals } from "@std/assert/equals";
import { Parser } from "./parser.ts";

Deno.test("Parser > nested", function () {
  const p = new Parser("foo.bar");
  assertEquals(p.tokens, [
    { start: 0, type: "UnquotedIdentifier", value: "foo" },
    { start: 3, type: "Dot", value: "." },
    { start: 4, type: "UnquotedIdentifier", value: "bar" },
    { start: 7, type: "EOF", value: "" },
  ]);
  const t = p.parse();
  assertEquals(
    t,
    {
      children: [
        {
          name: "foo",
          type: "Field",
        },
        {
          name: "bar",
          type: "Field",
        },
      ],
      type: "Subexpression",
    },
  );
});
