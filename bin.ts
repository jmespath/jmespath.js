#!/usr/bin/env -S deno run

import { JmesPath } from "./mod.ts";

if (Deno.args.length < 1) {
  console.error("Must provide a jmespath expression.");
  Deno.exit(1);
}

const inputJSON: string[] = [];

const decoder = new TextDecoder();
for await (const chunk of Deno.stdin.readable) {
  const text = decoder.decode(chunk);
  inputJSON.push(text);
}

const expression = Deno.args[0];

const parsedInput = JSON.parse(inputJSON.join(""));

const res = new JmesPath(parsedInput).search(expression);

console.info(JSON.stringify(res));
