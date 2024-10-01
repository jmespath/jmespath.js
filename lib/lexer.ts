import { InvalidValueError } from "./errors.ts";
import {
  isBasicToken,
  isOperatorStartToken,
  isSkipChars,
  type JSONValue,
  TOKEN,
  type TokenObj,
  TOKENS_BASIC_MAP,
} from "./structs.ts";
import { isAlpha, isAlphaNum, isNum } from "./utils.ts";

export class Lexer {
  readonly expression: string;

  #index = 0;

  get #currentChar(): string {
    return this.expression[this.#index];
  }

  constructor(expression: string) {
    this.expression = expression;
  }

  tokenize(): TokenObj[] {
    const tokens: TokenObj[] = [];
    this.#index = 0;
    let start: number;
    let identifier;
    let token;
    while (this.#index < this.expression.length) {
      if (isAlpha(this.#currentChar)) {
        start = this.#index;
        identifier = this.#consumeUnquotedIdentifier();
        tokens.push({
          type: TOKEN.UnquotedIdentifier,
          value: identifier,
          start: start,
        });
      } else if (isBasicToken(this.#currentChar)) {
        tokens.push({
          type: TOKENS_BASIC_MAP[this.#currentChar],
          value: this.#currentChar,
          start: this.#index,
        });
        this.#index++;
      } else if (isNum(this.#currentChar)) {
        token = this.#consumeNumber();
        tokens.push(token);
      } else if (this.#currentChar === "[") {
        // No need to increment this._current.  This happens
        // in _consumeLBracket
        token = this.#consumeLBracket();
        tokens.push(token);
      } else if (this.#currentChar === '"') {
        start = this.#index;
        identifier = this.#consumeQuotedIdentifier();
        tokens.push({
          type: TOKEN.QuotedIdentifier,
          value: identifier,
          start: start,
        });
      } else if (this.#currentChar === "'") {
        start = this.#index;
        identifier = this.#consumeRawStringLiteral();
        tokens.push({
          type: TOKEN.Literal,
          value: identifier,
          start: start,
        });
      } else if (this.#currentChar === "`") {
        start = this.#index;
        const literal = this.#consumeLiteral();
        tokens.push({
          type: TOKEN.Literal,
          value: literal,
          start: start,
        });
      } else if (isOperatorStartToken(this.#currentChar)) {
        const token = this.#consumeOperator();
        if (token) {
          tokens.push(token);
        }
      } else if (isSkipChars(this.#currentChar)) {
        // Ignore whitespace.
        this.#index++;
      } else if (this.#currentChar === "&") {
        start = this.#index;
        this.#index++;
        if (this.#currentChar === "&") {
          this.#index++;
          tokens.push({
            type: TOKEN.And,
            value: "&&",
            start: start,
          });
        } else {
          tokens.push({
            type: TOKEN.Expref,
            value: "&",
            start: start,
          });
        }
      } else if (this.#currentChar === "|") {
        start = this.#index;
        this.#index++;
        if (this.#currentChar === "|") {
          this.#index++;
          tokens.push({
            type: TOKEN.Or,
            value: "||",
            start: start,
          });
        } else {
          tokens.push({
            type: TOKEN.Pipe,
            value: "|",
            start: start,
          });
        }
      } else {
        throw new InvalidValueError(
          `Unknown character: '${this.#currentChar}'`,
        );
      }
    }
    return tokens;
  }

  #consumeUnquotedIdentifier(): string {
    const start = this.#index;
    this.#index++;
    while (
      this.#index < this.expression.length &&
      isAlphaNum(this.expression[this.#index])
    ) {
      this.#index++;
    }
    return this.expression.slice(start, this.#index);
  }

  #consumeQuotedIdentifier(): JSONValue {
    const start = this.#index;
    this.#index++;
    const maxLength = this.expression.length;
    while (this.expression[this.#index] !== '"' && this.#index < maxLength) {
      // You can escape a double quote and you can escape an escape.
      let current = this.#index;
      if (
        this.expression[current] === "\\" &&
        (this.expression[current + 1] === "\\" ||
          this.expression[current + 1] === '"')
      ) {
        current += 2;
      } else {
        current++;
      }
      this.#index = current;
    }
    this.#index++;
    return JSON.parse(this.expression.slice(start, this.#index));
  }

  #consumeRawStringLiteral(): string {
    const start = this.#index;
    this.#index++;
    const maxLength = this.expression.length;
    while (this.expression[this.#index] !== "'" && this.#index < maxLength) {
      // You can escape a single quote and you can escape an escape.
      let current = this.#index;
      if (
        this.expression[current] === "\\" &&
        (this.expression[current + 1] === "\\" ||
          this.expression[current + 1] === "'")
      ) {
        current += 2;
      } else {
        current++;
      }
      this.#index = current;
    }
    this.#index++;
    const literal = this.expression.slice(start + 1, this.#index - 1);
    return literal.replace("\\'", "'");
  }

  #consumeNumber(): TokenObj {
    const start = this.#index;
    this.#index++;
    const maxLength = this.expression.length;
    while (isNum(this.expression[this.#index]) && this.#index < maxLength) {
      this.#index++;
    }
    const value = parseInt(this.expression.slice(start, this.#index));
    return { type: TOKEN.Number, value: value, start: start };
  }

  #consumeLBracket(): TokenObj {
    const start = this.#index;
    this.#index++;
    if (this.expression[this.#index] === "?") {
      this.#index++;
      return { type: TOKEN.Filter, value: "[?", start: start };
    } else if (this.expression[this.#index] === "]") {
      this.#index++;
      return { type: TOKEN.Flatten, value: "[]", start: start };
    } else {
      return { type: TOKEN.Lbracket, value: "[", start: start };
    }
  }

  #consumeOperator(): TokenObj | undefined {
    const start = this.#index;
    const startingChar = this.expression[start];
    this.#index++;
    if (startingChar === "!") {
      if (this.expression[this.#index] === "=") {
        this.#index++;
        return { type: TOKEN.Ne, value: "!=", start: start };
      } else {
        return { type: TOKEN.Not, value: "!", start: start };
      }
    } else if (startingChar === "<") {
      if (this.expression[this.#index] === "=") {
        this.#index++;
        return { type: TOKEN.Lte, value: "<=", start: start };
      } else {
        return { type: TOKEN.Lt, value: "<", start: start };
      }
    } else if (startingChar === ">") {
      if (this.expression[this.#index] === "=") {
        this.#index++;
        return { type: TOKEN.Gte, value: ">=", start: start };
      } else {
        return { type: TOKEN.Gt, value: ">", start: start };
      }
    } else if (startingChar === "=") {
      if (this.expression[this.#index] === "=") {
        this.#index++;
        return { type: TOKEN.Eq, value: "==", start: start };
      }
    }
  }

  #consumeLiteral(): JSONValue {
    this.#index++;
    const start = this.#index;
    const maxLength = this.expression.length;
    let literal: JSONValue;
    while (this.expression[this.#index] !== "`" && this.#index < maxLength) {
      // You can escape a literal char or you can escape the escape.
      let current = this.#index;
      if (
        this.expression[current] === "\\" &&
        (this.expression[current + 1] === "\\" ||
          this.expression[current + 1] === "`")
      ) {
        current += 2;
      } else {
        current++;
      }
      this.#index = current;
    }
    const literalString = this.expression.slice(start, this.#index).trimStart()
      .replace("\\`", "`");
    if (this.#looksLikeJSON(literalString)) {
      literal = JSON.parse(literalString);
    } else {
      // Try to JSON parse it as "<literal>"
      literal = JSON.parse('"' + literalString + '"');
    }
    // +1 gets us to the ending "`", +1 to move on to the next char.
    this.#index++;
    return literal;
  }

  #looksLikeJSON(literalString: string): boolean {
    const startingChars = '[{"';
    const jsonLiterals = ["true", "false", "null"];
    const numberLooking = "-0123456789";

    if (literalString === "") {
      return false;
    } else if (startingChars.indexOf(literalString[0]) >= 0) {
      return true;
    } else if (jsonLiterals.indexOf(literalString) >= 0) {
      return true;
    } else if (numberLooking.indexOf(literalString[0]) >= 0) {
      try {
        JSON.parse(literalString);
        return true;
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }
}
