import { fError, InvalidTypeError, InvalidValueError } from "./errors.ts";
import { Lexer } from "./lexer.ts";
import {
  BindingPowerToken,
  type JSONValue,
  TOKEN,
  type Token,
  type TokenObj,
} from "./structs.ts";

export type ParserAst = {
  type: string;
  jmespathType?: typeof TOKEN.Expref;
  value?: number;
  name?: string;
  children?: (JSONValue)[];
};

export class Parser {
  readonly lexer: Lexer;
  readonly tokens: TokenObj[];

  #index: number = 0;

  constructor(expression: string) {
    this.lexer = new Lexer(expression);

    this.tokens = this.lexer.tokenize();
    this.tokens.push({
      type: TOKEN.Eof,
      value: "",
      start: expression.length,
    });
  }

  parse(): ParserAst {
    this.#index = 0;
    const ast = this.#expression(0);
    if (this.#lookahead() !== TOKEN.Eof) {
      const t = this.#lookaheadToken();
      throw new InvalidValueError(fError.unexpectedToken(t));
    }
    return ast;
  }

  #expression(rbp: number): ParserAst {
    const leftToken = this.#lookaheadToken();
    this.#advance();

    let left = this.#nud(leftToken);

    let currentToken = this.#lookahead();
    while (rbp < BindingPowerToken[currentToken]) {
      this.#advance();
      left = this.#led(currentToken, left);
      currentToken = this.#lookahead();
    }
    return left;
  }

  #lookahead(number: number = 0): Token {
    return this.tokens[this.#index + number].type;
  }

  #lookaheadToken(number: number = 0): TokenObj {
    return this.tokens[this.#index + number];
  }

  #advance(): void {
    this.#index++;
  }

  #nud(token: TokenObj): ParserAst {
    switch (token.type) {
      case TOKEN.Literal:
        return { type: "Literal", value: token.value as number };
      case TOKEN.UnquotedIdentifier:
        return { type: "Field", name: token.value as string };
      case TOKEN.QuotedIdentifier: {
        const node = { type: "Field", name: token.value as string };
        if (this.#lookahead() === TOKEN.Lparen) {
          throw new InvalidValueError(
            "Quoted identifier not allowed for function names.",
          );
        }
        return node;
      }
      case TOKEN.Not: {
        const right = this.#expression(BindingPowerToken.Not);
        return { type: "NotExpression", children: [right] };
      }
      case TOKEN.Star: {
        const left = { type: "Identity" };
        let right = null;
        if (this.#lookahead() === TOKEN.Rbracket) {
          // This can happen in a multiselect,
          // [a, b, *]
          right = { type: "Identity" };
        } else {
          right = this.#parseProjectionRHS(BindingPowerToken.Star);
        }
        return { type: "ValueProjection", children: [left, right] };
      }
      case TOKEN.Filter:
        return this.#led(token.type, { type: "Identity" });
      case TOKEN.Lbrace:
        return this.#parseMultiselectHash();
      case TOKEN.Flatten: {
        const left = { type: TOKEN.Flatten, children: [{ type: "Identity" }] };
        const right = this.#parseProjectionRHS(BindingPowerToken.Flatten);
        return { type: "Projection", children: [left, right] };
      }
      case TOKEN.Lbracket:
        if (
          this.#lookahead() === TOKEN.Number ||
          this.#lookahead() === TOKEN.Colon
        ) {
          const right = this.#parseIndexExpression();
          return this.#projectIfSlice({ type: "Identity" }, right);
        } else if (
          this.#lookahead() === TOKEN.Star &&
          this.#lookahead(1) === TOKEN.Rbracket
        ) {
          this.#advance();
          this.#advance();
          const right = this.#parseProjectionRHS(BindingPowerToken.Star);
          return {
            type: "Projection",
            children: [{ type: "Identity" }, right],
          };
        }
        return this.#parseMultiselectList();
      case TOKEN.Current:
        return { type: TOKEN.Current };
      case TOKEN.Expref: {
        const expression = this.#expression(BindingPowerToken.Expref);
        return { type: "ExpressionReference", children: [expression] };
      }
      case TOKEN.Lparen: {
        const args = [];
        let expression: ParserAst;
        while (this.#lookahead() !== TOKEN.Rparen) {
          if (this.#lookahead() === TOKEN.Current) {
            expression = { type: TOKEN.Current };
            this.#advance();
          } else {
            expression = this.#expression(0);
          }
          args.push(expression);
        }
        this.#match(TOKEN.Rparen);
        return args[0];
      }
      default:
        throw new InvalidValueError(fError.invalidToken(token));
    }
  }

  #led(tokenName: Token, left: ParserAst): ParserAst {
    switch (tokenName) {
      case TOKEN.Dot: {
        const rbp = BindingPowerToken.Dot;
        if (this.#lookahead() !== TOKEN.Star) {
          const right = this.#parseDotRHS(rbp);
          return { type: "Subexpression", children: [left, right] };
        }
        // Creating a projection.
        this.#advance();
        const right = this.#parseProjectionRHS(rbp);
        return { type: "ValueProjection", children: [left, right] };
      }
      case TOKEN.Pipe: {
        const right = this.#expression(BindingPowerToken.Pipe);
        return { type: TOKEN.Pipe, children: [left, right] };
      }
      case TOKEN.Or: {
        const right = this.#expression(BindingPowerToken.Or);
        return { type: "OrExpression", children: [left, right] };
      }
      case TOKEN.And: {
        const right = this.#expression(BindingPowerToken.And);
        return { type: "AndExpression", children: [left, right] };
      }
      case TOKEN.Lparen: {
        const name = (left as { type: string; name: JSONValue }).name;
        const args = [];
        let expression;
        while (this.#lookahead() !== TOKEN.Rparen) {
          if (this.#lookahead() === TOKEN.Current) {
            expression = { type: TOKEN.Current };
            this.#advance();
          } else {
            expression = this.#expression(0);
          }
          if (this.#lookahead() === TOKEN.Comma) {
            this.#match(TOKEN.Comma);
          }
          args.push(expression);
        }
        this.#match(TOKEN.Rparen);
        const node = { type: "Function", name: name as string, children: args };
        return node;
      }
      case TOKEN.Filter: {
        const condition = this.#expression(0);
        this.#match(TOKEN.Rbracket);
        let right: ParserAst | undefined;
        if (this.#lookahead() === TOKEN.Flatten) {
          right = { type: "Identity" };
        } else {
          right = this.#parseProjectionRHS(BindingPowerToken.Filter);
        }
        return {
          type: "FilterProjection",
          children: [left, right, condition],
        };
      }
      case TOKEN.Flatten: {
        const leftNode = { type: TOKEN.Flatten, children: [left] };
        const rightNode = this.#parseProjectionRHS(
          BindingPowerToken.Flatten,
        );
        return { type: "Projection", children: [leftNode, rightNode] };
      }
      case TOKEN.Eq:
      case TOKEN.Ne:
      case TOKEN.Gt:
      case TOKEN.Gte:
      case TOKEN.Lt:
      case TOKEN.Lte:
        return this.#parseComparator(left, tokenName);
      case TOKEN.Lbracket: {
        const token = this.#lookaheadToken();
        if (token.type === TOKEN.Number || token.type === TOKEN.Colon) {
          const right = this.#parseIndexExpression();
          return this.#projectIfSlice(left, right);
        }
        this.#match(TOKEN.Star);
        this.#match(TOKEN.Rbracket);
        const right = this.#parseProjectionRHS(BindingPowerToken.Star);
        return { type: "Projection", children: [left, right] };
      }
      default:
        throw new InvalidValueError(
          fError.invalidToken(this.#lookaheadToken()),
        );
    }
  }

  #match(tokenType: Token): void {
    if (this.#lookahead() === tokenType) {
      this.#advance();
    } else {
      const t = this.#lookaheadToken();
      throw new InvalidTypeError(fError.expectedValue(tokenType, t.type));
    }
  }

  #parseIndexExpression(): ParserAst {
    if (
      this.#lookahead() === TOKEN.Colon ||
      this.#lookahead(1) === TOKEN.Colon
    ) {
      return this.#parseSliceExpression();
    } else {
      const node = {
        type: "Index",
        value: this.#lookaheadToken().value as number,
      };
      this.#advance();
      this.#match(TOKEN.Rbracket);
      return node;
    }
  }

  #projectIfSlice(left: ParserAst, right: ParserAst): ParserAst {
    const indexExpr = { type: "IndexExpression", children: [left, right] };
    if (right.type === "Slice") {
      return {
        type: "Projection",
        children: [
          indexExpr,
          this.#parseProjectionRHS(BindingPowerToken.Star),
        ],
      };
    } else {
      return indexExpr;
    }
  }

  #parseSliceExpression(): ParserAst {
    // [start:end:step] where each part is optional, as well as the last
    // colon.
    const parts: [number | null, number | null, number | null] = [
      null,
      null,
      null,
    ];
    let index = 0;
    let currentToken = this.#lookahead();
    while (currentToken !== TOKEN.Rbracket && index < 3) {
      if (currentToken === TOKEN.Colon) {
        index++;
        this.#advance();
      } else if (currentToken === TOKEN.Number) {
        parts[index] = this.#lookaheadToken().value as number;
        this.#advance();
      } else {
        const t = this.#lookaheadToken();
        throw new InvalidValueError(fError.unexpectedToken(t));
      }
      currentToken = this.#lookahead();
    }
    this.#match(TOKEN.Rbracket);
    return {
      type: "Slice",
      children: parts,
    };
  }

  #parseComparator(left: ParserAst, comparator: Token): ParserAst {
    const right = this.#expression(BindingPowerToken[comparator]);
    return {
      type: "Comparator",
      name: comparator,
      children: [left, right],
    };
  }

  #parseDotRHS(rbp: number): ParserAst | undefined {
    const lookahead = this.#lookaheadToken();
    const exprTokens: string[] = [
      TOKEN.UnquotedIdentifier,
      TOKEN.QuotedIdentifier,
      TOKEN.Star,
    ];
    if (exprTokens.includes(lookahead.type)) {
      return this.#expression(rbp);
    } else if (lookahead.type === TOKEN.Lbracket) {
      this.#match(TOKEN.Lbracket);
      return this.#parseMultiselectList();
    } else if (lookahead.type === TOKEN.Lbrace) {
      this.#match(TOKEN.Lbrace);
      return this.#parseMultiselectHash();
    }
  }

  #parseProjectionRHS(rbp: number): ParserAst | undefined {
    let right: ParserAst | undefined;
    if (BindingPowerToken[this.#lookahead()] < 10) {
      right = { type: "Identity" };
    } else if (this.#lookahead() === TOKEN.Lbracket) {
      right = this.#expression(rbp);
    } else if (this.#lookahead() === TOKEN.Filter) {
      right = this.#expression(rbp);
    } else if (this.#lookahead() === TOKEN.Dot) {
      this.#match(TOKEN.Dot);
      right = this.#parseDotRHS(rbp);
    } else {
      const t = this.#lookaheadToken();
      throw new InvalidValueError(fError.unexpectedToken(t));
    }
    return right;
  }

  #parseMultiselectList(): ParserAst {
    const expressions = [];
    while (this.#lookahead() !== TOKEN.Rbracket) {
      const expression = this.#expression(0);
      expressions.push(expression);
      if (this.#lookahead() === TOKEN.Comma) {
        this.#match(TOKEN.Comma);
        const token = this.#lookaheadToken();
        if (token.type === TOKEN.Rbracket) {
          throw new InvalidValueError(fError.unexpectedToken(token));
        }
      }
    }
    this.#match(TOKEN.Rbracket);
    return { type: "MultiSelectList", children: expressions };
  }

  #parseMultiselectHash(): ParserAst {
    const pairs = [];
    const identifierTypes: string[] = [
      TOKEN.UnquotedIdentifier,
      TOKEN.QuotedIdentifier,
    ];
    let keyToken, keyName, value, node;
    while (true) {
      keyToken = this.#lookaheadToken();
      if (!identifierTypes.includes(keyToken.type)) {
        throw new InvalidValueError(fError.expectedValue(
          "an identifier token",
          keyToken.type,
        ));
      }
      keyName = keyToken.value;
      this.#advance();
      this.#match(TOKEN.Colon);
      value = this.#expression(0);
      node = { type: "KeyValuePair", name: keyName, value: value };
      pairs.push(node);
      if (this.#lookahead() === TOKEN.Comma) {
        this.#match(TOKEN.Comma);
      } else if (this.#lookahead() === TOKEN.Rbrace) {
        this.#match(TOKEN.Rbrace);
        break;
      }
    }
    return { type: "MultiSelectHash", children: pairs };
  }
}
