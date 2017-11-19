// @flow

export default class LineParser {
  _label: ?string;
  _op: ?string;
  _operand: ?string;
  _comment: ?string;

  constructor(line: string) {
    let stripped = this._stripComment(line);
    stripped = this._stripLabel(stripped);
    stripped = this._stripOp(stripped);
    this._stripOperand(stripped);

    // if (this._operand != null && this._op == null) {
    //   throw new Error('Syntax error in opcode.');
    // }
  }

  get label(): ?string {
    return this._label;
  }

  get op(): ?string {
    return this._op;
  }

  get operand(): ?string {
    return this._operand;
  }

  operandAsString(): string {
    const operand = this._operand;
    if (operand == null || operand.length === 0) {
      return '';
    }
    let chars = operand.split('');
    if (chars[0] === '/' && chars[chars.length-1] === '/') {
      chars = chars.slice(1, chars.length - 1);
    }

    for (let i = 0; i < chars.length - 1; i++) {
      if (chars[i] === '/' && chars[i+1] === '/') {
        chars.splice(i, 1);
      }
    }

    return chars.join('');
  }

  get comment(): ?string {
    return this._comment;
  }

  isEmptyLine(): boolean {
    return this._label == null && this._op == null && this._operand == null && this._comment == null;
  }

  isCommentOnly(): boolean {
    return this._label == null && this._op == null && this._operand == null && this._comment != null;
  }

  toString(): string {
    const unoptional = (s: ?string): string =>
      s == null ? '<missing>' : s;

    const label = unoptional(this._label);
    const op = unoptional(this._op);
    const operand = unoptional(this._operand);
    const comment = unoptional(this._comment);

    return `label='${label}' op='${op}' operand='${operand}' comment='${comment}'`;
  }

  _stripComment(line: string): string {
    // this is a little bit tricky because we have to avoid
    // comment markers (semicolon) in character and string
    // constants.
    // character constants are single-quote + character
    // e.g. 'A is 0x41
    // strings are slash data slash, with slash slash
    // representing a literal slash
    // e.g. /EITHER//OR/ is the string EITHER/OR

    let commentIndex = -1;
    let nextIsCharConst = false;
    let inString = false;

    for (let i = 0; i < line.length && commentIndex === -1; i++) {
      if (nextIsCharConst) {
        nextIsCharConst = false;
        continue;
      }

      let c = line.charAt(i);
      if (inString) {
        if (c === '/') {
          if (i < line.length - 1 && line.charAt(i+1) === '/') {
            // literal / encoded as // - skip it.
            i++;
            continue;
          }
          inString = false;
          continue;
        }
      }

      switch(c) {
      case '/':
        inString = true;
        break;

      case "'":
        nextIsCharConst = true;
        break;

      case ';':
        commentIndex = i;
        break;
      }
    }

    if (commentIndex === -1) {
      return line;
    }

    this._comment = line.substr(commentIndex);
    return line.substr(0, commentIndex);
  }

  _stripLabel(line: string): string {
    // label must begin in first column, be 1-6 characters, and
    // terminated by colon. it's also case insensitive so we force
    // it to upper case
    const match = line.match(/^([A-Za-z_]\w{1,5}):\s*(.*)$/);
    if (match != null) {
      const [, label, rest] = match;
      this._label = label.toUpperCase();
      return rest;
    }

    return line;
  }

  _stripOp(line: string): string {
    const match = line.match(/^\s*([A-Za-z]+)\s*(.*)$/);
    if (match != null) {
      const [, op, rest] = match;
      this._op = op.toUpperCase();
      return rest;
    }
    return line;
  }

  _stripOperand(line: string): void {
    const match = line.match(/^\s*(.+?)\s*$/);
    if (match != null) {
      const [, operand] = match;
      this._operand = operand.toUpperCase();
    }
  }
}
