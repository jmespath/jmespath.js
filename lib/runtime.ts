import { unreachable } from "@std/assert";
import {
  fError,
  InvalidArityError,
  InvalidTypeError,
  UnknownFunctionError,
} from "./errors.ts";
import {
  type JSONArray,
  type JSONObject,
  type JSONValue,
  mapTypeCodeToName,
  TOKEN,
  TYPE_CODE,
  TYPE_NAME,
  type TypeCode,
} from "./structs.ts";
import type { TreeInterpreter } from "./tree-interpreter.ts";
import { assertIsArray, isObject } from "./utils.ts";
import type { ParserAst } from "./parser.ts";

export type RuntimeFunctionTableElementSignature = {
  types: TypeCode[];
  constiadic?: true;
};
export type RuntimeFunctionTableElement = {
  // deno-lint-ignore no-explicit-any
  func: (resolvedArgs: any) => any;
  signature: RuntimeFunctionTableElementSignature[];
};
export type RuntimeFunctionTable = Record<string, RuntimeFunctionTableElement>;

export class Runtime {
  readonly _interpreter: TreeInterpreter;

  readonly functionTable: RuntimeFunctionTable = {
    // name: [function, <signature>]
    // The <signature> can be:
    //
    // {
    //   args: [[type1, type2], [type1, type2]],
    //   constiadic: true|false
    // }
    //
    // Each arg in the arg list is a list of valid types
    // (if the function is overloaded and supports multiple
    // types.  If the type is "any" then no type checking
    // occurs on the argument.  constiadic is optional
    // and if not provided is assumed to be false.
    abs: {
      func: this.#functionAbs,
      signature: [{ types: [TYPE_CODE.Number] }],
    },
    avg: {
      func: this.#functionAvg,
      signature: [{ types: [TYPE_CODE.ArrayNumber] }],
    },
    ceil: {
      func: this.#functionCeil,
      signature: [{ types: [TYPE_CODE.Number] }],
    },
    contains: {
      func: this.#functionContains,
      signature: [
        { types: [TYPE_CODE.String, TYPE_CODE.Array] },
        { types: [TYPE_CODE.Any] },
      ],
    },
    "ends_with": {
      func: this.#functionEndsWith,
      signature: [
        { types: [TYPE_CODE.String] },
        { types: [TYPE_CODE.String] },
      ],
    },
    floor: {
      func: this.#functionFloor,
      signature: [{ types: [TYPE_CODE.Number] }],
    },
    length: {
      func: this.#functionLength,
      signature: [{
        types: [
          TYPE_CODE.String,
          TYPE_CODE.Array,
          TYPE_CODE.Object,
        ],
      }],
    },
    map: {
      func: this.#functionMap,
      signature: [{ types: [TYPE_CODE.Expref] }, {
        types: [TYPE_CODE.Array],
      }],
    },
    max: {
      func: this.#functionMax,
      signature: [{
        types: [
          TYPE_CODE.ArrayNumber,
          TYPE_CODE.ArrayString,
        ],
      }],
    },
    "merge": {
      func: this.#functionMerge,
      signature: [{ types: [TYPE_CODE.Object], constiadic: true }],
    },
    "max_by": {
      func: this.#functionMaxBy,
      signature: [{ types: [TYPE_CODE.Array] }, {
        types: [TYPE_CODE.Expref],
      }],
    },
    sum: {
      func: this.#functionSum,
      signature: [{ types: [TYPE_CODE.ArrayNumber] }],
    },
    "starts_with": {
      func: this.#functionStartsWith,
      signature: [{ types: [TYPE_CODE.String] }, {
        types: [TYPE_CODE.String],
      }],
    },
    min: {
      func: this.#functionMin,
      signature: [{
        types: [
          TYPE_CODE.ArrayNumber,
          TYPE_CODE.ArrayString,
        ],
      }],
    },
    "min_by": {
      func: this.#functionMinBy,
      signature: [
        { types: [TYPE_CODE.Array] },
        { types: [TYPE_CODE.Expref] },
      ],
    },
    type: {
      func: this.#functionType,
      signature: [{ types: [TYPE_CODE.Any] }],
    },
    keys: {
      func: this.#functionKeys,
      signature: [{ types: [TYPE_CODE.Object] }],
    },
    values: {
      func: this.#functionValues,
      signature: [{ types: [TYPE_CODE.Object] }],
    },
    sort: {
      func: this.#functionSort,
      signature: [
        {
          types: [
            TYPE_CODE.ArrayString,
            TYPE_CODE.ArrayNumber,
          ],
        },
      ],
    },
    "sort_by": {
      func: this.#functionSortBy,
      signature: [
        { types: [TYPE_CODE.Array] },
        { types: [TYPE_CODE.Expref] },
      ],
    },
    join: {
      func: this.#functionJoin,
      signature: [
        { types: [TYPE_CODE.String] },
        { types: [TYPE_CODE.ArrayString] },
      ],
    },
    reverse: {
      func: this.#functionReverse,
      signature: [
        { types: [TYPE_CODE.String, TYPE_CODE.Array] },
      ],
    },
    "to_array": {
      func: this.#functionToArray,
      signature: [{ types: [TYPE_CODE.Any] }],
    },
    "to_string": {
      func: this.#functionToString,
      signature: [{ types: [TYPE_CODE.Any] }],
    },
    "to_number": {
      func: this.#functionToNumber,
      signature: [{ types: [TYPE_CODE.Any] }],
    },
    "not_null": {
      func: this.#functionNotNull,
      signature: [{ types: [TYPE_CODE.Any], constiadic: true }],
    },
  } as const;

  constructor(interpreter: TreeInterpreter) {
    this._interpreter = interpreter;
  }

  callFunction(name: string, resolvedArgs: JSONValue[]): JSONValue {
    const functionEntry = this.functionTable[name];
    if (functionEntry === undefined) {
      throw new UnknownFunctionError(`${name}()`);
    }
    this.#validateArgs(name, resolvedArgs, functionEntry.signature);
    return functionEntry.func.call(this, resolvedArgs);
  }

  /**
   * Validating the args requires validating
   * the correct arity and the correct type of each arg.
   * If the last argument is declared as constiadic, then we need
   * a minimum number of args to be required.  Otherwise it has to
   * be an exact amount.
   */
  #validateArgs(
    name: string,
    args: JSONValue[],
    signature: RuntimeFunctionTableElementSignature[],
  ) {
    if (
      (
        signature[signature.length - 1].constiadic &&
        args.length < signature.length
      ) ||
      (
        !signature[signature.length - 1].constiadic &&
        args.length !== signature.length
      )
    ) {
      throw new InvalidArityError(fError.expectedAguments(
        name,
        signature.length,
        args.length,
      ));
    }
    let currentSpec;
    let actualType: TypeCode;
    let typeMatched;
    for (const [i, sign] of signature.entries()) {
      typeMatched = false;
      currentSpec = sign.types;
      actualType = this.#getTypeName(args[i]);
      for (const spec of currentSpec) {
        if (this.#typeMatches(actualType, spec, args[i])) {
          typeMatched = true;
          break;
        }
      }
      if (!typeMatched) {
        const expected = currentSpec
          .map(function (typeIdentifier) {
            return TYPE_NAME[typeIdentifier];
          })
          .join(",");
        throw new InvalidTypeError(
          fError.expectedValue(
            `${name}() argument ${(i + 1)} to be type ${expected}`,
            TYPE_NAME[actualType],
          ),
        );
      }
    }
  }

  #typeMatches(
    actual: TypeCode,
    expected: TypeCode,
    argValue: JSONValue,
  ): boolean {
    if (expected === TYPE_CODE.Any) {
      return true;
    }
    if (
      expected === TYPE_CODE.ArrayString ||
      expected === TYPE_CODE.ArrayNumber ||
      expected === TYPE_CODE.Array
    ) {
      // The expected type can either just be array,
      // or it can require a specific subtype (array of numbers).
      //
      // The simplest case is if "array" with no subtype is specified.
      if (expected === TYPE_CODE.Array) {
        return actual === TYPE_CODE.Array;
      } else if (actual === TYPE_CODE.Array) {
        // Otherwise we need to check subtypes.
        // I think this has potential to be improved.
        let subtype: TypeCode;
        if (expected === TYPE_CODE.ArrayNumber) {
          subtype = TYPE_CODE.Number;
        } else if (expected === TYPE_CODE.ArrayString) {
          subtype = TYPE_CODE.String;
        } else {
          return false;
        }

        assertIsArray(argValue);

        for (const arg of argValue) {
          if (
            !this.#typeMatches(
              this.#getTypeName(arg),
              subtype,
              arg,
            )
          ) {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    } else {
      return actual === expected;
    }
  }

  #getTypeName(obj: JSONValue): TypeCode {
    const objToString = Object.prototype.toString.call(obj);
    switch (objToString) {
      case "[object String]":
        return TYPE_CODE.String;
      case "[object Number]":
        return TYPE_CODE.Number;
      case "[object Array]":
        return TYPE_CODE.Array;
      case "[object Boolean]":
        return TYPE_CODE.Boolean;
      case "[object Null]":
        return TYPE_CODE.Null;
      case "[object Object]":
        // Check if it's an expref.  If it has, it's been
        // tagged with a jmespathType attr of 'Expref';
        if (
          (obj as { jmespathType: string }).jmespathType ===
            TOKEN.Expref
        ) {
          return TYPE_CODE.Expref;
        } else {
          return TYPE_CODE.Object;
        }
      default:
        unreachable(`Unexpected object type ${objToString}`);
    }
  }

  #functionStartsWith(resolvedArgs: [string, string]): boolean {
    const searchStr = resolvedArgs[0];
    const prefix = resolvedArgs[1];
    return searchStr.lastIndexOf(prefix) === 0;
  }

  #functionEndsWith(resolvedArgs: [string, string]): boolean {
    const searchStr = resolvedArgs[0];
    const suffix = resolvedArgs[1];
    return searchStr.indexOf(suffix, searchStr.length - suffix.length) !==
      -1;
  }

  #functionReverse(resolvedArgs: JSONValue[]): JSONValue {
    const typeName = this.#getTypeName(resolvedArgs[0]);
    if (typeName === TYPE_CODE.String) {
      const original = resolvedArgs[0] as string;
      return original.split("").reverse().join("");
    } else {
      const original = resolvedArgs[0] as JSONValue[];
      return original.toReversed();
    }
  }

  #functionAbs(resolvedArgs: [number]): number {
    return Math.abs(resolvedArgs[0]);
  }

  #functionCeil(resolvedArgs: [number]): number {
    return Math.ceil(resolvedArgs[0]);
  }

  #functionAvg(resolvedArgs: [number[]]): number {
    const inputArray = resolvedArgs[0];
    const sum = inputArray.reduce((a, b) => a + b, 0);
    return (sum / inputArray.length) || 0;
  }

  #functionContains(resolvedArgs: [JSONArray, string]): boolean {
    return resolvedArgs[0].indexOf(resolvedArgs[1]) >= 0;
  }

  #functionFloor(resolvedArgs: [number]): number {
    return Math.floor(resolvedArgs[0]);
  }

  #functionLength(resolvedArgs: [string | JSONArray | JSONObject]): number {
    if (!isObject(resolvedArgs[0])) {
      return resolvedArgs[0].length;
    } else {
      // As far as I can tell, there's no way to get the length
      // of an object without O(n) iteration through the object.
      return Object.keys(resolvedArgs[0]).length;
    }
  }

  #functionMap(resolvedArgs: [ParserAst, JSONArray]): ParserAst[] {
    const mapped = [];
    const interpreter = this._interpreter;
    const exprefNode = resolvedArgs[0];
    const elements = resolvedArgs[1];
    for (const element of elements) {
      mapped.push(
        interpreter.visit(exprefNode, element),
      );
    }
    return mapped as ParserAst[];
  }

  #functionMerge(resolvedArgs: JSONObject[]): JSONObject {
    const merged: JSONObject = {};
    for (const current of resolvedArgs) {
      for (const key of Object.keys(current)) {
        merged[key] = current[key];
      }
    }
    return merged;
  }

  #functionMax(resolvedArgs: [JSONArray]): string | number | null {
    if (resolvedArgs[0].length > 0) {
      const typeName = this.#getTypeName(resolvedArgs[0][0]);
      if (typeName === TYPE_CODE.Number) {
        return Math.max(...resolvedArgs[0] as number[]);
      } else {
        const elements = resolvedArgs[0] as string[];
        let maxElement = elements[0] as string;
        for (const element of elements) {
          if (maxElement.localeCompare(element) < 0) {
            maxElement = element;
          }
        }
        return maxElement;
      }
    } else {
      return null;
    }
  }

  #functionMin(resolvedArgs: [JSONArray]): string | number | null {
    const arg1 = resolvedArgs[0];
    if (arg1.length > 0) {
      const typeName = this.#getTypeName(arg1[0]);
      if (typeName === TYPE_CODE.Number) {
        return Math.min(...arg1 as number[]);
      } else {
        const elements = arg1 as string[];
        let minElement = elements[0] as string;
        for (const element of elements) {
          if (element.localeCompare(minElement) < 0) {
            minElement = element;
          }
        }
        return minElement;
      }
    } else {
      return null;
    }
  }

  #functionSum(resolvedArgs: [number[]]) {
    const inputArray = resolvedArgs[0];
    return inputArray.reduce((a, b) => a + b, 0);
  }

  #functionType(resolvedArgs: JSONValue[]): string {
    const typeName = this.#getTypeName(resolvedArgs[0]);
    switch (typeName) {
      case TYPE_CODE.Number:
        return "number";
      case TYPE_CODE.String:
        return "string";
      case TYPE_CODE.Array:
        return "array";
      case TYPE_CODE.Object:
        return "object";
      case TYPE_CODE.Boolean:
        return "boolean";
      case TYPE_CODE.Expref:
        return "expref";
      case TYPE_CODE.Null:
        return "null";
      default:
        unreachable(`Unexpected type name '${typeName}'`);
    }
  }

  #functionKeys(resolvedArgs: [JSONObject]): string[] {
    return Object.keys(resolvedArgs[0]);
  }

  #functionValues(resolvedArgs: [JSONObject]): JSONValue[] {
    const obj = resolvedArgs[0];
    const keys = Object.keys(obj);
    const values: JSONValue[] = [];
    for (const key of keys) {
      values.push(obj[key]);
    }
    return values;
  }

  #functionJoin(resolvedArgs: [string, JSONArray]): string {
    const joinChar = resolvedArgs[0];
    const listJoin = resolvedArgs[1];
    return listJoin.join(joinChar);
  }

  #functionToArray(resolvedArgs: JSONValue[]): JSONArray {
    if (this.#getTypeName(resolvedArgs[0]) === TYPE_CODE.Array) {
      return resolvedArgs[0] as JSONArray;
    } else {
      return [resolvedArgs[0]];
    }
  }

  #functionToString(resolvedArgs: JSONValue[]): string {
    if (this.#getTypeName(resolvedArgs[0]) === TYPE_CODE.String) {
      return resolvedArgs[0] as string;
    } else {
      return JSON.stringify(resolvedArgs[0]);
    }
  }

  #functionToNumber(resolvedArgs: JSONValue[]): number | null {
    const typeName = this.#getTypeName(resolvedArgs[0]);
    if (typeName === TYPE_CODE.Number) {
      return resolvedArgs[0] as number;
    } else if (typeName === TYPE_CODE.String) {
      const convertedValue = parseFloat(resolvedArgs[0] as string);
      if (!Number.isNaN(convertedValue)) {
        return convertedValue;
      }
    }
    return null;
  }

  #functionNotNull(resolvedArgs: JSONValue[]): JSONValue | null {
    for (const arg of resolvedArgs) {
      if (this.#getTypeName(arg) !== TYPE_CODE.Null) {
        return arg;
      }
    }
    return null;
  }

  #functionSort(resolvedArgs: JSONArray[]): JSONArray {
    const sortedArray = resolvedArgs[0].slice(0);
    sortedArray.sort();
    return sortedArray;
  }

  #functionSortBy(resolvedArgs: [JSONArray, ParserAst]): JSONArray {
    const sortedArray = resolvedArgs[0].slice(0);
    if (sortedArray.length === 0) {
      return sortedArray;
    }
    const interpreter = this._interpreter;
    const exprefNode = resolvedArgs[1];
    const requiredType = this.#getTypeName(
      interpreter.visit(exprefNode, sortedArray[0]),
    );
    const validCodeTypes = [TYPE_CODE.Number, TYPE_CODE.String];
    if (
      validCodeTypes.indexOf(requiredType as 0) < 0
    ) {
      throw new InvalidTypeError(
        fError.expectedValue(
          `one of [${mapTypeCodeToName(...validCodeTypes).toString()}]`,
          mapTypeCodeToName(requiredType).toString(),
        ),
      );
    }
    // In order to get a stable sort out of an unstable
    // sort algorithm, we decorate/sort/undecorate (DSU)
    // by creating a new list of [index, element] pairs.
    // In the cmp function, if the evaluated elements are
    // equal, then the index will be used as the tiebreaker.
    // After the decorated list has been sorted, it will be
    // undecorated to extract the original elements.
    const decorated: JSONValue[][] = [];
    for (const [i, el] of sortedArray.entries()) {
      decorated.push([i, el]);
    }
    decorated.sort((a, b) => {
      const exprA = interpreter.visit(
        exprefNode,
        a[1],
      );
      const exprB = interpreter.visit(
        exprefNode,
        b[1],
      );
      if (this.#getTypeName(exprA) !== requiredType) {
        throw new InvalidTypeError(
          fError.expectedValue(
            mapTypeCodeToName(requiredType).toString(),
            mapTypeCodeToName(this.#getTypeName(exprA)).toString(),
          ),
        );
      } else if (this.#getTypeName(exprB) !== requiredType) {
        throw new InvalidTypeError(
          fError.expectedValue(
            mapTypeCodeToName(requiredType).toString(),
            mapTypeCodeToName(this.#getTypeName(exprB)).toString(),
          ),
        );
      }
      if (exprA! > exprB!) {
        return 1;
      } else if (exprA! < exprB!) {
        return -1;
      } else {
        // If they're equal compare the items by their
        // order to maintain relative order of equal keys
        // (i.e. to get a stable sort).
        return (a as number[])[0] - (b as number[])[0];
      }
    });
    // Undecorate: extract out the original list elements.
    for (const [i, el] of decorated.entries()) {
      sortedArray[i] = el[1];
    }
    return sortedArray;
  }

  #functionMaxBy(resolvedArgs: [JSONArray, ParserAst]): JSONValue {
    const exprefNode = resolvedArgs[1];
    const resolvedArray = resolvedArgs[0];
    const keyFunction = this.createKeyFunction(exprefNode, [
      TYPE_CODE.Number,
      TYPE_CODE.String,
    ]);
    let maxNumber: number = -Infinity;
    let maxRecord: JSONValue = null;
    let current: number;
    for (const el of resolvedArray) {
      current = keyFunction(
        el,
      ) as unknown as number;
      if (current > maxNumber) {
        maxNumber = current;
        maxRecord = el;
      }
    }
    return maxRecord;
  }

  #functionMinBy(resolvedArgs: [JSONArray, ParserAst]): JSONValue {
    const exprefNode = resolvedArgs[1];
    const resolvedArray = resolvedArgs[0];
    const keyFunction = this.createKeyFunction(exprefNode, [
      TYPE_CODE.Number,
      TYPE_CODE.String,
    ]);
    let minNumber: number = Infinity;
    let minRecord: JSONValue = null;
    let current: number;
    for (const el of resolvedArray) {
      current = keyFunction(
        el,
      ) as unknown as number;
      if (current < minNumber) {
        minNumber = current;
        minRecord = el;
      }
    }
    return minRecord;
  }

  createKeyFunction(
    exprefNode: ParserAst,
    allowedTypes: TypeCode[],
  ): (x: JSONValue) => ParserAst {
    const interpreter = this._interpreter;
    const keyFunc = (x: JSONValue): ParserAst => {
      const current = interpreter.visit(exprefNode, x);
      if (allowedTypes.indexOf(this.#getTypeName(current)) < 0) {
        throw new InvalidTypeError(
          fError.expectedValue(
            `one of [${mapTypeCodeToName(...allowedTypes).toString()}]`,
            mapTypeCodeToName(this.#getTypeName(current)).toString(),
          ),
        );
      }
      return current as ParserAst;
    };
    return keyFunc;
  }
}
