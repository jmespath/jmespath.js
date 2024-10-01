import { Parser } from "./lib/parser.ts";
import type { JSONValue } from "./lib/structs.ts";
import { TreeInterpreter } from "./lib/tree-interpreter.ts";

export class JmesPath {
  data: JSONValue;
  interpreter: TreeInterpreter;

  constructor(data: JSONValue) {
    this.data = data;

    this.interpreter = new TreeInterpreter(this.data);
  }
  search(expression: string): JSONValue {
    const parser = new Parser(expression);
    return this.interpreter.search(parser);
  }
}
