// @flow

import type {ExpressionResult} from './Types';

import invariant from 'assert';

type TokenType = 'const' | 'symbol' | 'operator';

type Token = {
  type: TokenType;
  text: string;
  value?: number;
};

export type ExpressionEvaluatorState = {
  radix: number;
};

function executeOp(
  lhs: ExpressionResult,
  rhs: ExpressionResult,
  op: (lhs: number, rhs: number) => number
): ExpressionResult {
  return {
    value: op(lhs.value, rhs.value),
    undefinedSymbols: new Set([
      ...lhs.undefinedSymbols,
      ...rhs.undefinedSymbols
    ])
  };
}

export default class ExpressionEvaluator {
  _tokens: Token[];
  _symbols: Map<string, number>;
  _radix: number;
  _index: number;
  _functions: Map<string, (ExpressionResult) => ExpressionResult> = new Map([
    ['LO', (n: ExpressionResult) => {return {undefinedSymbols:n.undefinedSymbols, value:n.value & 0xFF}}],
    ['HI', (n: ExpressionResult) => {return {undefinedSymbols:n.undefinedSymbols, value:(n.value >> 8) & 0xFF}}],
  ]);

  constructor(symbols: Map<string, number>) {
    this._symbols = symbols;
    this._radix = 10;
  }

  evaluate(line: string): ExpressionResult {
    this._tokens = [];

    let tail: string = line;

    while (tail.length > 0) {
      tail = this._parseToken(tail);
    }

    this._index = 0;

    const result = this._expression();
    return result;
  }

  setRadix(radix: number): void {
    if (radix != 8 && radix != 10 && radix != 16) {
      throw new Error('Radix must be 8 (octal), 10 (decimal) or 16 (hex)');
    }
    this._radix = radix;
  }

  get state(): ExpressionEvaluatorState {
    return {
      radix: this._radix
    };
  }

  set state(s: ExpressionEvaluatorState): void {
    this._radix = s.radix;
  }

  _expression(): ExpressionResult {
    let lhs: ExpressionResult = this._aterm();

    while (true) {
      let operator = this._expectOperator();

      if (operator == null) {
        break;
      }

      if (operator !== '+' && operator !== '-') {
        break;
      }

      this._index++;

      let rhs: ExpressionResult = this._aterm();

      switch (operator) {
      case '+':
        lhs = executeOp(lhs, rhs, (x,y) => x+y);
        break;

      case '-':
        lhs = executeOp(lhs, rhs, (x,y) => x-y);
        break;
      }
    }
    return lhs;
  }

  _aterm(): ExpressionResult {
    let lhs: ExpressionResult = this._mterm();

    while (true) {
      let operator = this._expectOperator();

      if (operator == null) {
        break;
      }

      if (operator !== '*' && operator !== '/') {
        return lhs;
      }

      this._index++;

      let rhs: ExpressionResult = this._mterm();

      switch (operator) {
      case '*':
        lhs = executeOp(lhs, rhs, (x,y) => x*y);
        break;

      case '/':
        lhs = executeOp(lhs, rhs, (x,y) => x/y);
        break;
      }
    }
    return lhs;
  }

  _mterm(): ExpressionResult {
    const token = this._tokens[this._index];
    if (token != null && token.type === 'symbol') {
      const nextToken = this._tokens[this._index + 1];
      if (nextToken != null && nextToken.type === 'operator' && nextToken.text === '(') {
        const fn = this._functions.get(token.text);
        if (fn == null) {
          throw new Error(`Invalid function ${token.text}`);
        }

        this._index += 2;
        const value = fn(this._expression());

        const closeToken = this._tokens[this._index];
        if (closeToken == null || closeToken.type != 'operator' || closeToken.text != ')') {
          throw new Error('Function missing close paren');
        }

        this._index++;

        return value;
      }
    }

    const value = this._valueOf(this._index++, this._symbols);
    return value;
  }

  _expectOperator(): ?string {
    let token = this._tokens[this._index];
    if (token == null) {
      return null;
    }
    if (token.type !== 'operator') {
      throw new Error('Operator expected');
    }

    return token.text;
  }

  _parseToken(line: string): string {
    let match = line.match(/^\s*(.*)$/);
    let tail: string = line;
    let text: string;

    if (match != null) {
      [, tail] = match;
    }

    if (tail.length === 0) {
      return tail;
    }

    const radPattern = /^(\$|0[xXdDoO])(.*)$/;
    const octPattern = /^([0-7]+)(.*)$/;
    const decPattern = /^(\d+)(.*)$/;
    const hexPattern = /^([0-9a-fA-f]+)(.*)$/;
    const numMatchers: Map<number, RegExp> = new Map([
      [8, octPattern],
      [10, decPattern],
      [16, hexPattern],
    ]);

    let radix = this._radix;

    const radMatch = tail.match(radPattern);
    let radPrefix = '';
    if (radMatch != null) {
      [, radPrefix, tail] = radMatch;

      switch (radPrefix.toLowerCase()) {
      case '$':
      case '0x':
        radix = 16;
        break;

      case '0d':
        radix = 10;
        break;

      case '0o':
        radix = 8;
        break;
      }
    }

    // digit means number in the default radix. Note that if radix is hex,
    // then the number must still start with 0..9 to distinguish it from
    // a possible symbol
    if (radMatch != null || /^\d/.test(tail)) {
      let matcher: ?RegExp = numMatchers.get(radix);
      invariant(matcher != null, 'Could not find proper pattern matcher for radix');
      const numMatch = tail.match(matcher);
      if (numMatch == null) {
        throw new Error(`Invalid numeric constant of radix ${radix}`);
      }

      let constStr;
      [, constStr, tail] = numMatch;
      const value = parseInt(constStr, radix);
      this._tokens.push({
        type: 'const',
        text: `${radPrefix}${constStr}`,
        value
      });
      return tail;
    }

    // 'x means ASCII encoding of x
    match = tail.match(/^'(.)(.*)$/);
    if (match) {
      [, text, tail] = match;
      this._tokens.push({
        type: 'const',
        text,
        value: text.charCodeAt(0)
      });
      return tail;
    }

    match = tail.match(/^(([A-Za-z_]\w*)|(\.))(.*)$/);
    if (match != null) {
      // NB really a symbol is 1..6 characters, but
      // if we limit the regex to that, THISISTOOLONG
      // will end up parsing as 3 symbols
      // THISIS, TOOLON, G, so just keep and truncate
      // later.
      [, text,,, tail] = match;
      this._tokens.push({
        type: 'symbol',
        text
      });
      return tail;
    }

    match = tail.match(/^([-+*/()])(.*)/);
    if (match != null) {
      [, text, tail] = match;
      this._tokens.push({
        type: 'operator',
        text
      });
      return tail;
    }

    throw new Error(`Invalid expression starting with ${tail}`);
  }

  _isValue(index: number): boolean {
    return (
      this._tokens[index] !== null && (
        this._tokens[index].type === 'const' ||
        this._tokens[index].type === 'symbol'
      )
    );
  }

  _valueOf(index: number, symbols: Map<string, number>): ExpressionResult {
    if (this._tokens[index] != null) {
      const {type, text, value} = this._tokens[index];

      if (type === 'const') {
        invariant(value != null);
        return {undefinedSymbols: new Set(), value};
      } else if (type === 'symbol') {
        const symVal = symbols.get(text);
        if (symVal == null) {
          return {undefinedSymbols: new Set([text]), value: 0};
        }
        return {undefinedSymbols: new Set(), value: symVal};
      }
    }
    throw new Error('Value expected.');
  }
}
