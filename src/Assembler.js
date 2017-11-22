// @flow
require('babel-core/register');
require('babel-polyfill');

import type {ExpressionResult, OpcodeSet, OpHandler, OpHandlers, OpcodeBytes} from './types';
import type {ExpressionEvaluatorState} from './ExpressionEvaluator';

import fs from 'fs';
import invariant from 'invariant';
import ExpressionEvaluator from './ExpressionEvaluator';
import LineParser from './LineParser';
import Listing from './Listing';
import ListingMarker from './ListingMarker';
import OpcodeDefinitions from './OpcodeDefinitions';
import ObjectCode from './ObjectCode';
import path from 'path';
import readline from 'readline';
import replaceExt from 'replace-ext';
import {sprintf} from 'sprintf-js';

type ParsedLine = {
  label?: string,
  op?: string,
  operands?: string,
  comment?: string,
};

type CachedForwardReference = {
  location: number,
  lineParser: LineParser,
  marker: ListingMarker,
  reserve: number,
  evalState: ExpressionEvaluatorState,
};

export default class Assembler {
  static _commentPattern = /^\s*(;.*)$/;

  _opHandlers: Map<string, OpHandler>;

  _filename: string;
  _source: string[];
  _currentLineNo: number;
  _listing: Listing;
  _location: number = 0;
  _symbols: Map<string, number>;
  _expressionEvaluator: ExpressionEvaluator;
  _cachedForwardReferences: CachedForwardReference[];
  _nextLineMarker: ?ListingMarker;
  _pass2: boolean;
  _undefinedSymbols: Set<string>;
  _objectCode: ObjectCode;

  constructor(filename: string) {
    const handlers: OpHandlers = {
      title: this._title.bind(this),
      org: this._org.bind(this),
      byte: this._byte.bind(this),
      word: this._word.bind(this),
      block: this._block.bind(this),
      ascii: this._ascii.bind(this),
      end: this._end.bind(this),
      set: this._set.bind(this),
      radix: this._radix.bind(this),
      opcode: this._opcode.bind(this),
      implied: this._implied.bind(this),
      accumulator: this._accumulator.bind(this),
      immediate: this._immediate.bind(this),
      zeroPage: this._zeroPage.bind(this),
      zeroPageX: this._zeroPageX.bind(this),
      zeroPageY: this._zeroPageY.bind(this),
      absolute: this._absolute.bind(this),
      absoluteX: this._absoluteX.bind(this),
      absoluteY: this._absoluteY.bind(this),
      indirect: this._indirect.bind(this),
      indirectX: this._indirectX.bind(this),
      indirectY: this._indirectY.bind(this),
      relative: this._relative.bind(this),
    };

    this._opHandlers = OpcodeDefinitions(handlers);

    this._filename = filename;
    this._listing = new Listing();
    this._symbols = new Map();
    this._expressionEvaluator = new ExpressionEvaluator(this._symbols);
    this._cachedForwardReferences = [];
    this._objectCode = new ObjectCode();
  }

  async assemble(): Promise<void> {
    try {
      this._source = await this._readSource();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }

    this._pass2 = false;
    this._currentLineNo = 0;
    for (const line of this._source) {
      this._currentLineNo++;
      try {
        this._parseLine(line);
      } catch (error) {
        this._listing.addError(this._currentLineNo, error.message);
      }
    }

    this._pass2 = true;
    this._undefinedSymbols = new Set();
    for (const forward of this._cachedForwardReferences) {
      this._location = forward.location;
      const target = this._location + forward.reserve;
      const lineParser = forward.lineParser;

      // we wouldn't have saved the op if it weren't valid
      const op = lineParser.op;
      invariant(op != null, 'op bad in forward reference');
      const opHandler = this._opHandlers.get(op);
      invariant(opHandler != null, 'opHandler bad in forward reference');

      // Expression evaluator needs to be at the state it was in
      // when the op was first eval'ed
      this._expressionEvaluator.state = forward.evalState;

      this._nextLineMarker = forward.marker;
      try {
        opHandler(lineParser);
      } catch (error) {
        // $TODO clean this up to be on the right line
        this._listing.addError(this._currentLineNo, error.message);
      }
    }
    this._nextLineMarker = null;

    if (this._undefinedSymbols.size !== 0) {
      const undefs = Array.from(this._undefinedSymbols).join("', '");
      this._listing.addError(0, `UNDEFINED: '${undefs}'`);
    }

    this._listing.printListing();

    const objFile = replaceExt(this._filename, '.OBJ');
    this._objectCode.writeObjectFile(objFile);
  }

  async _readSource(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const source: string[] = [];
      try {
        const reader = readline.createInterface({
          input: fs.createReadStream(this._filename),
          crlfDelay: Infinity
        });

      this._source = [];
      reader
        .on('line', line => source.push(line))
        .on('close', () => resolve(source));

      } catch (err) {
        resolve(err);
      }
    });
  }

  _parseLine(line: string): void {
    const lineParser = new LineParser(line);

    if (lineParser.isEmptyLine()) {
      this._listing.addLine({
        lineNumber: this._currentLineNo,
      });
      return;
    }

    if (lineParser.isCommentOnly()) {
      const comment = lineParser.comment;
      invariant(comment != null, 'comment must exist');
      this._listing.addLine({
        lineNumber: this._currentLineNo,
        comment
      });
      return;
    }

    const label = lineParser.label;
    if (label != null) {
      if (this._symbols.has(label)) {
        throw new Error(`Attempt to redefine symbol '${label}'`);
      }
      this._symbols.set(label, this._location);
    }

    const op = lineParser.op;
    if (op == null) {
      this._addListingLine(lineParser, null);
      return;
    }

    const opHandler = this._opHandlers.get(op);
    if (opHandler == null) {
      this._addListingLine(lineParser, null);
      throw new Error(`Unknown opcode '${op}'`);
    }

    opHandler(lineParser);
  }

  _addListingLine(lineParser: LineParser, bytes: ?(number[])): void {
    let args = {
      lineNumber: this._currentLineNo,
    };

    if (this._nextLineMarker != null) {
      args = {...args, lineNumber: this._nextLineMarker.insertionPoint+1};
    }

    if (!lineParser.isCommentOnly()) {
      args = {...args, address: this._location};
    }

    if (lineParser.label != null) {
      args = {...args, label: lineParser.label};
    }

    if (bytes != null) {
      args = {...args, bytes};
    }

    if (lineParser.op != null) {
      args = {...args, opcode: lineParser.op};
    }

    if (lineParser.operand != null) {
      args = {...args, operands: lineParser.operand};
    }

    if (lineParser.comment) {
      args = {...args, comment: lineParser.comment};
    }

    if (this._nextLineMarker != null) {
      this._listing.replaceLineBefore(args, this._nextLineMarker);
      return;
    }

    this._listing.addLine(args);
  }

  _title(lineParser: LineParser): void {
    this._addListingLine(lineParser);
  }

  _org(lineParser: LineParser): void {
    this._addListingLine(lineParser, null);

    const operand = lineParser.operand;
    if (operand == null) {
      throw new Error('ORG requires address argument');
    }

    const result = this._evaluate(operand);
    const address = result.value;

    this._check16BitRange(address);
    this._location = address;
  }

  _word(lineParser: LineParser): void {
    const operand = lineParser.operand;

    // if there is no value, then just reserve space for one word
    if (operand == null) {
      this._addListingLine(lineParser, null);
      this._location += 2;
      return;
    }

    const result = this._evaluate(operand);
    if (result.undefinedSymbols.size !== 0 && !this._pass2) {
      this._cacheForwardReferenceInstruction(lineParser, 2);
      return;
    }

    const value = result.value;

    const bytes: number[] = [
      value & 0xFF,
      value >> 8
    ];

    this._objectCode.set(this._location, bytes);

    this._addListingLine(lineParser, bytes);
    this._location += 2;
  }

  _block(lineParser: LineParser): void {
    const operand = lineParser.operand;
    if (operand == null) {
      throw new Error('Number of bytes required');
    }

    const result = this._evaluate(operand);
    if (result.undefinedSymbols.size != 0) {
      throw new Error('BLOCK may not reference forward symbols');
    }
    const value = result.value;

    this._addListingLine(lineParser);
    this._location += value;
  }

  _ascii(lineParser: LineParser) {
    const bytes = lineParser.operandAsString()
      .split('')
      .map(_ => _.charCodeAt(0));
    this._objectCode.set(this._location, bytes);
    this._addListingLine(lineParser, bytes);
    this._location += bytes.length;
  }

  _byte(lineParser: LineParser): void {
    const operand = lineParser.operand;

    // if there is no value, then just reserve space for one word
    if (operand == null) {
      this._addListingLine(lineParser, null);
      this._location = this._location + 1;
      return;
    }

    const result = this._evaluate(operand);

    const value = result.value;
    if (!this._check8BitRange(value)) {
      throw new Error('Value does not fit in byte');
    }

    const bytes: number[] = [value];
    this._objectCode.set(this._location, bytes);

    this._addListingLine(lineParser, bytes);
    this._location = this._location + 1;
  }

  _end(lineParser: LineParser): void {
    this._addListingLine(lineParser, null);
  }

  _set(lineParser: LineParser): void {
    const operand = lineParser.operand;
    if (operand == null) {
      throw new Error('Missing operand');
    }
    const match = operand.match(/^\s*([A-Za-z_]\w{0,5})\s*=\s*(.*)$/);
    if (match == null) {
      throw new Error('Syntax error');
    }

    const [, sym, expr] = match;
    const result = this._evaluate(expr);
    if (result.undefinedSymbols.size !== 0) {
      throw new Error('Operands to SET may not be forward references.');
    }

    this._symbols.set(sym, result.value);

    let args = {
      lineNumber: this._currentLineNo,
      address: result.value,
      opcode: 'SET',
      operands: operand,
    };

    if (lineParser.label) {
      args = {...args, label: lineParser.label};
    }

    if (lineParser.comment) {
      args = {...args, comments: lineParser.comment};
    }

    this._listing.addLine(args);
  }

  _radix(lineParser: LineParser): void {
    const operand = lineParser.operand;
    if (operand == null) {
      throw new Error('Missing operand');
    }

    if (!/^\d+$/.test(operand)) {
      throw new Error('Operand must be an integer');
    }

    const radix = parseInt(operand, 10);
    this._expressionEvaluator.setRadix(radix);
  }

  _opcode(lineParser: LineParser, modes: OpcodeSet): void {
    let bytes: ?(number[]);
    let length: ?number;

    for (const mode of modes) {
      const b = mode(lineParser);

      if (b == null) {
        continue;
      }

      if (length == null || b.length < length) {
        length = b.length;
      }

      if (b.bytes != null && (bytes == null || b.bytes.length < bytes.length)) {
        bytes = b.bytes;
      }
    }

    this._addListingLine(lineParser, bytes);

    if (bytes == null && length != null && !this._pass2) {
      this._cacheForwardReferenceInstruction(lineParser, length);
      return;
    }

    if (bytes == null) {
      throw new Error('invalid operands');
    }

    this._objectCode.set(this._location, bytes);
    this._location += bytes.length;
  }

  _cacheForwardReferenceInstruction(
    lineParser: LineParser,
    reserve: number): void {
    this._cachedForwardReferences.push({
      location: this._location,
      lineParser,
      marker: this._listing.getInsertionPoint(),
      reserve,
      evalState: this._expressionEvaluator.state,
    });

    this._location += reserve;
  }

  _implied(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    if (lineParser.operand != null) {
      return null;
    }
    return {bytes: [opcode], length: 1};
  }

  _accumulator(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    if (operand.match(/^\s*A\s*/) == null) {
      return null;
    }

    return {bytes: [opcode], length: 1};
  }

  _immediate(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }
    let rest: string = operand;

    let match = rest.match(/^\s*#(.*)$/);
    if (match == null) {
      return null;
    }

    [,rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      const value = result.value;
      if (!this._check8BitRange(value)) {
        this._addListingLine(lineParser, bytes);
        throw new Error('Immediate operand does not fit in 8 bits');
      }

      bytes = [opcode, value];
    } catch (error) {
      return null;
    }
    return {bytes, length:2};
  }

  _zeroPage(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(operand);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      const value = result.value;
      if (!this._check8BitRange(value)) {
        throw new Error('Immediate operand does not fit in 8 bits');
      }

      bytes = [opcode, value];
    } catch (error) {
      return null;
    }

    return {bytes, length: 2};
  }

  _zeroPageX(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^(.*),X$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      const value = result.value;
      if (!this._check8BitRange(value)) {
        throw new Error('Immediate operand does not fit in 8 bits');
      }

      bytes = [opcode, value];
    } catch (error) {
      return null;
    }

    return {bytes, length: 2};
  }

  _zeroPageY(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^(.*),Y$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      const value = result.value;
      if (!this._check8BitRange(value)) {
        throw new Error('Immediate operand does not fit in 8 bits');
      }

      bytes = [opcode, value];
    } catch (error) {
      return null;
    }

    return {bytes, length: 2};
  }

  _absolute(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(operand);
      if (result.undefinedSymbols.size != 0) {
        return {length: 3};
      }

      const value = result.value;
      // $TODO 16 bit check
      bytes = [opcode, value & 0xFF, value >> 8];
    } catch (error) {
      return null;
    }

    return {bytes, length: 3};
  }

  _absoluteX(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^(.*),X$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 3};
      }

      const value = result.value;

      // $TODO 16 bit check
      bytes = [opcode, value & 0xFF, value >> 8];
    } catch (error) {
      return null;
    }

    return {bytes, length: 3};
  }

  _absoluteY(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^(.*),Y$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 3};
      }

      const value = result.value;

      // $TODO 16 bit check
      bytes = [opcode, value & 0xFF, value >> 8];
    } catch (error) {
      return null;
    }

    return {bytes, length: 3};
  }

  _indirect(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^\((.*)\)$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 3};
      }

      const value = result.value;
      this._check16BitRange(value);
      bytes = [opcode, value & 0xFF, value >> 8];
    } catch (error) {
      return null;
    }

    return {bytes, length: 3};
  }

  _indirectX(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^\((.*),X\)$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      const value = result.value;

      if (!this._check8BitRange(value)) {
        throw new Error('Immediate operand does not fit in 8 bits');
      }

      bytes = [opcode, value];
    } catch (error) {
      return null;
    }

    return {bytes, length: 2};
  }

  _indirectY(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let rest: string = operand;

    const match = rest.match(/^\((.*)\),Y$/);
    if (match == null) {
      return null;
    }

    [, rest] = match;

    let bytes: ?(number[]) = null;

    try {
      const result = this._evaluate(rest);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      const value = result.value;
      if (!this._check8BitRange(value)) {
        throw new Error('Immediate operand does not fit in 8 bits');
      }

      bytes = [opcode, value];
    } catch (error) {
      return null;
    }

    return {bytes, length: 2};
  }

  // Relative instructions *only* have relative mode, so unlike the
  // other modes, we throw exceptions here if something goes wrong.
  _relative(opcode: number, lineParser: LineParser): ?OpcodeBytes {
    const operand = lineParser.operand;
    if (operand == null) {
      return null;
    }

    let bytes: number[];

    try {
      const result = this._evaluate(operand);
      if (result.undefinedSymbols.size != 0) {
        return {length: 2};
      }

      // operand is a signed byte relative to the end of the instruction
      const value = result.value;
      const offset = value - (this._location + 2);
      if (offset < -128 || offset > 127) {
        throw new Error('Relative branch target is too far away.');
      }

      bytes = [opcode, offset & 0xFF];
    } catch (error) {
      return null;
    }

    return {bytes, length: 2};
  }

  _check16BitRange(n: number): void {
    if (n < 0 || n > 0xFFFF) {
      throw new Error('expression result does not fit in 16 bits.');
    }
  }

  _check8BitRange(n: number): boolean {
    return (n >= 0 && n <= 0xFF);
  }

  _isCommentOrEmpty(s: string): boolean {
    return s.match(/(^\s*)|(^\s*;)/) !== null;
  }

  _evaluate(expression: string): ExpressionResult {
    const result = this._expressionEvaluator.evaluate(expression);
    if (this._pass2) {
      this._undefinedSymbols = new Set([
        ...this._undefinedSymbols,
        ...result.undefinedSymbols
      ]);
    }
    return result;
  }
}
