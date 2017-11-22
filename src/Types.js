// @flow

import LineParser from './LineParser';

export type OpcodeBytes = {
  bytes?: number[];
  length: number;
};

export type OpcodeSet =
  ((LineParser) => ?OpcodeBytes)[];

export type OpHandler = (LineParser) => void;
export type OpcodeHandler = (number, LineParser) => ?OpcodeBytes;

export type OpHandlers = {
  title: OpHandler,
  org: OpHandler,
  byte: OpHandler,
  word: OpHandler,
  end: OpHandler,
  block: OpHandler,
  ascii: OpHandler,
  set: OpHandler,
  radix: OpHandler,
  opcode: (LineParser, OpcodeSet) => void,
  implied: OpcodeHandler,
  accumulator: OpcodeHandler,
  immediate: OpcodeHandler,
  zeroPage: OpcodeHandler,
  zeroPageX: OpcodeHandler,
  zeroPageY: OpcodeHandler,
  absolute: OpcodeHandler,
  absoluteX: OpcodeHandler,
  absoluteY: OpcodeHandler,
  indirect: OpcodeHandler,
  indirectX: OpcodeHandler,
  indirectY: OpcodeHandler,
  relative: OpcodeHandler,
};

export type ExpressionResult = {
  value: number,
  undefinedSymbols: Set<string>,
};
