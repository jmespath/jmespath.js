export type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface JSONObject {
  [k: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}

export type TokenObj = {
  type: Token;
  value: JSONValue;
  start: number;
};

export const TYPE_CODE = {
  Number: 0,
  Any: 1,
  String: 2,
  Array: 3,
  Object: 4,
  Boolean: 5,
  Expref: 6,
  Null: 7,
  ArrayNumber: 8,
  ArrayString: 9,
} as const;

export type TypeCode = typeof TYPE_CODE[keyof typeof TYPE_CODE];

export const TYPE_NAME = {
  [TYPE_CODE.Number]: "number",
  [TYPE_CODE.Any]: "any",
  [TYPE_CODE.String]: "string",
  [TYPE_CODE.Array]: "array",
  [TYPE_CODE.Object]: "object",
  [TYPE_CODE.Boolean]: "boolean",
  [TYPE_CODE.Expref]: "expression",
  [TYPE_CODE.Null]: "null",
  [TYPE_CODE.ArrayNumber]: "Array<number>",
  [TYPE_CODE.ArrayString]: "Array<string>",
};

export type TypeName = typeof TYPE_NAME[keyof typeof TYPE_NAME];

export function mapTypeCodeToName(...codes: TypeCode[]): TypeName[] {
  return codes.map((c) => TYPE_NAME[c]);
}

export const TOKEN = {
  Eof: "EOF",
  UnquotedIdentifier: "UnquotedIdentifier",
  QuotedIdentifier: "QuotedIdentifier",
  Rbracket: "Rbracket",
  Rparen: "Rparen",
  Comma: "Comma",
  Colon: "Colon",
  Rbrace: "Rbrace",
  Number: "Number",
  Current: "Current",
  Expref: "Expref",
  Pipe: "Pipe",
  Or: "Or",
  And: "And",
  Eq: "EQ",
  Gt: "GT",
  Lt: "LT",
  Gte: "GTE",
  Lte: "LTE",
  Ne: "NE",
  Flatten: "Flatten",
  Star: "Star",
  Filter: "Filter",
  Dot: "Dot",
  Not: "Not",
  Lbrace: "Lbrace",
  Lbracket: "Lbracket",
  Lparen: "Lparen",
  Literal: "Literal",
} as const;

export type Token = typeof TOKEN[keyof typeof TOKEN];

/**
 * The "&", "[", "<", ">" tokens
 * are not in basicToken because
 * there are two token constiants
 * ("&&", "[?", "<=", ">=").  This is specially handled
 * below.
 */
export const TOKENS_BASIC_MAP = {
  ".": TOKEN.Dot,
  "*": TOKEN.Star,
  ",": TOKEN.Comma,
  ":": TOKEN.Colon,
  "{": TOKEN.Lbrace,
  "}": TOKEN.Rbrace,
  "]": TOKEN.Rbracket,
  "(": TOKEN.Lparen,
  ")": TOKEN.Rparen,
  "@": TOKEN.Current,
} as const;

export type BasicTokens = keyof typeof TOKENS_BASIC_MAP;

export function isBasicToken(ch: string): ch is BasicTokens {
  return Object.keys(TOKENS_BASIC_MAP).includes(ch);
}

export const TOKEN_OPERATOR_START = {
  LeftAngleBracket: "<",
  RightAngleBracket: ">",
  Equals: "=",
  Not: "!",
} as const;

export type OperatorStartTokens =
  typeof TOKEN_OPERATOR_START[keyof typeof TOKEN_OPERATOR_START];

export function isOperatorStartToken(ch: string): ch is OperatorStartTokens {
  return Object.values<string>(TOKEN_OPERATOR_START).includes(ch);
}

export const SKIP_CHARS = {
  Space: " ",
  Tab: "\t",
  Newline: "\n",
} as const;

export type SkipChars = typeof SKIP_CHARS[keyof typeof SKIP_CHARS];

export function isSkipChars(ch: string): ch is SkipChars {
  return Object.values<string>(SKIP_CHARS).includes(ch);
}

export const BindingPowerToken: Record<Token, number> = {
  [TOKEN.Eof]: 0,
  [TOKEN.UnquotedIdentifier]: 0,
  [TOKEN.QuotedIdentifier]: 0,
  [TOKEN.Rbracket]: 0,
  [TOKEN.Rparen]: 0,
  [TOKEN.Comma]: 0,
  [TOKEN.Rbrace]: 0,
  [TOKEN.Number]: 0,
  [TOKEN.Current]: 0,
  [TOKEN.Expref]: 0,
  [TOKEN.Colon]: 0,
  [TOKEN.Literal]: 0,
  [TOKEN.Pipe]: 1,
  [TOKEN.Or]: 2,
  [TOKEN.And]: 3,
  [TOKEN.Eq]: 5,
  [TOKEN.Gt]: 5,
  [TOKEN.Lt]: 5,
  [TOKEN.Gte]: 5,
  [TOKEN.Lte]: 5,
  [TOKEN.Ne]: 5,
  [TOKEN.Flatten]: 9,
  [TOKEN.Star]: 20,
  [TOKEN.Filter]: 21,
  [TOKEN.Dot]: 40,
  [TOKEN.Not]: 45,
  [TOKEN.Lbrace]: 50,
  [TOKEN.Lbracket]: 55,
  [TOKEN.Lparen]: 60,
};
