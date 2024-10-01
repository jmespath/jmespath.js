import {
  InvalidSyntaxError,
  InvalidTypeError,
  InvalidValueError,
} from "./errors.ts";
import type { Parser, ParserAst } from "./parser.ts";
import { Runtime } from "./runtime.ts";
import { type JSONValue, TOKEN } from "./structs.ts";
import { isFalsy, isObject } from "./utils.ts";
import { equal } from "@std/assert";

export class TreeInterpreter {
  runtime: Runtime;
  readonly data: JSONValue;

  constructor(data: JSONValue) {
    this.data = data;
    this.runtime = new Runtime(this);
  }

  search(parser: Parser): JSONValue {
    const ast = parser.parse();
    return this.visit(ast, this.data);
  }

  visit(node: ParserAst | undefined, value: JSONValue): JSONValue {
    if (!node) {
      throw new InvalidSyntaxError(`Node was not defined (${typeof node})`);
    }

    switch (node.type) {
      case "Field":
        if (value !== null && isObject(value)) {
          const field = value[node.name!];
          if (field === undefined) {
            return null;
          } else {
            return field;
          }
        }
        return null;
      case "Subexpression": {
        const children = node.children as ParserAst[];

        let result = this.visit(children[0], value);
        for (let i = 1; i < children.length; i++) {
          result = this.visit(children[1], result!);
          if (result === null) {
            return null;
          }
        }
        return result;
      }
      case "IndexExpression": {
        const children = node.children as ParserAst[];

        const left = this.visit(children[0], value);
        const right = this.visit(children[1], left!);
        return right;
      }
      case "Index": {
        if (!Array.isArray(value)) {
          return null;
        }
        let index = node.value!;
        if (index < 0) {
          index = value.length + index;
        }
        let result = value[index];
        if (result === undefined) {
          result = null;
        }
        return result;
      }
      case "Slice": {
        if (!Array.isArray(value)) {
          return null;
        }
        const sliceParams = node.children!.slice(
          0,
        ) as number[];
        const computed = this.computeSliceParams(
          value.length,
          sliceParams,
        );
        const start = computed[0];
        const stop = computed[1];
        const step = computed[2];
        const result: number[] = [];
        if (step > 0) {
          for (let i = start; i < stop; i += step) {
            result.push(value[i] as number);
          }
        } else {
          for (let i = start; i > stop; i += step) {
            result.push(value[i] as number);
          }
        }
        return result;
      }
      case "Projection": {
        const children = node.children as ParserAst[];

        // Evaluate left child.
        const base = this.visit(
          children[0] as ParserAst,
          value,
        );
        if (!Array.isArray(base)) {
          return null;
        }
        const collected = [];
        for (const el of base) {
          const current = this.visit(
            children[1],
            el,
          );
          if (current !== null) {
            collected.push(current);
          }
        }
        return collected;
      }
      case "ValueProjection": {
        const children = node.children as ParserAst[];

        // Evaluate left child.
        const base = this.visit(
          children[0],
          value,
        );
        if (!isObject(base)) {
          return null;
        }
        const collected = [];
        const values = Object.values(base);
        for (const value of values) {
          const current = this.visit(
            children[1],
            value,
          );
          if (current !== null) {
            collected.push(current);
          }
        }
        return collected;
      }
      case "FilterProjection": {
        const children = node.children as ParserAst[];

        const base = this.visit(
          children[0],
          value,
        );
        if (!Array.isArray(base)) {
          return null;
        }
        const filtered = [];
        const finalResults = [];
        for (const el of base) {
          const matched = this.visit(
            children[2],
            el,
          );
          if (!isFalsy(matched)) {
            filtered.push(el);
          }
        }
        for (const el of filtered) {
          const current = this.visit(
            children[1],
            el,
          );
          if (current !== null) {
            finalResults.push(current);
          }
        }
        return finalResults;
      }
      case "Comparator": {
        const children = node.children as ParserAst[];
        const first = this.visit(
          children[0],
          value,
        ) as number;
        const second = this.visit(
          children[1],
          value,
        ) as number;
        switch (node.name) {
          case TOKEN.Eq:
            return equal(first, second);
          case TOKEN.Ne:
            return !equal(first, second);
          case TOKEN.Gt:
            return first > second;
          case TOKEN.Gte:
            return first >= second;
          case TOKEN.Lt:
            return first < second;
          case TOKEN.Lte:
            return first <= second;
          default:
            throw new InvalidValueError(
              "Unknown comparator: " + node.name,
            );
        }
      }
      case TOKEN.Flatten: {
        const children = node.children as ParserAst[];
        const original = this.visit(
          children[0],
          value,
        );
        if (!Array.isArray(original)) {
          return null;
        }
        const merged = [];
        for (const current of original) {
          if (Array.isArray(current)) {
            merged.push(...current);
          } else {
            merged.push(current);
          }
        }
        return merged;
      }
      case "Identity":
        return value;
      case "MultiSelectList": {
        if (value === null) {
          return null;
        }
        const children = node.children as ParserAst[];
        const collected = [];
        for (const child of children) {
          collected.push(
            this.visit(child, value),
          );
        }
        return collected;
      }
      case "MultiSelectHash": {
        if (value === null) {
          return null;
        }
        const children = node.children as ParserAst[];
        const collected: Record<string, JSONValue> = {};
        for (const child of children) {
          collected[child.name!] = this.visit(
            child.value as unknown as ParserAst,
            value,
          );
        }
        return collected;
      }
      case "OrExpression": {
        const children = node.children as ParserAst[];
        const matched = this.visit(
          children[0],
          value,
        );
        if (isFalsy(matched)) {
          return this.visit(children[1], value);
        }
        return matched;
      }
      case "AndExpression": {
        const children = node.children as ParserAst[];
        const first = this.visit(
          children[0],
          value,
        );

        if (isFalsy(first)) {
          return first;
        }
        return this.visit(children[1], value);
      }
      case "NotExpression": {
        const children = node.children as ParserAst[];
        const first = this.visit(
          children[0],
          value,
        );
        return isFalsy(first);
      }
      case "Literal":
        return node.value;
      case TOKEN.Pipe: {
        const children = node.children as ParserAst[];
        const left = this.visit(
          children[0],
          value,
        );
        return this.visit(children[1], left);
      }
      case TOKEN.Current:
        return value;
      case "Function": {
        const children = node.children as ParserAst[];
        const resolvedArgs = [];
        for (const child of children) {
          resolvedArgs.push(
            this.visit(child, value),
          );
        }
        return this.runtime.callFunction(
          node.name!,
          resolvedArgs,
        );
      }
      case "ExpressionReference": {
        const children = node.children as ParserAst[];
        const refNode = children[0];
        // Tag the node with a specific attribute so the type
        // checker verify the type.
        refNode!.jmespathType = TOKEN.Expref;
        return refNode as JSONValue;
      }
      default:
        throw new InvalidTypeError(
          "Unknown node type: " + node.type,
        );
    }
  }

  computeSliceParams(arrayLength: number, sliceParams: number[]): number[] {
    let start = sliceParams[0];
    let stop = sliceParams[1];
    let step = sliceParams[2];
    if (step === null) {
      step = 1;
    } else if (step === 0) {
      throw new InvalidValueError(
        "Invalid slice, step cannot be 0",
      );
    }
    const stepValueNegative = step < 0 ? true : false;

    if (start === null) {
      start = stepValueNegative ? arrayLength - 1 : 0;
    } else {
      start = this.capSliceRange(arrayLength, start, step);
    }

    if (stop === null) {
      stop = stepValueNegative ? -1 : arrayLength;
    } else {
      stop = this.capSliceRange(arrayLength, stop, step);
    }
    return [start, stop, step];
  }

  capSliceRange(
    arrayLength: number,
    actualValue: number,
    step: number,
  ): number {
    if (actualValue < 0) {
      actualValue += arrayLength;
      if (actualValue < 0) {
        actualValue = step < 0 ? -1 : 0;
      }
    } else if (actualValue >= arrayLength) {
      actualValue = step < 0 ? arrayLength - 1 : arrayLength;
    }
    return actualValue;
  }
}
