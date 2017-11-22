// @flow

import type {OpHandler, OpHandlers} from './Types';

export default function OpcodeDefinitions(h: OpHandlers): Map<string, OpHandler> {
  return new Map([
    ['TITLE', (s) => h.title(s)],
    ['ORG', (s) => h.org(s)],
    ['BYTE', (s) => h.byte(s)],
    ['WORD', (s) => h.word(s)],
    ['END', (s) => h.end(s)],
    ['BLOCK', (s) => h.block(s)],
    ['ASCII', (s) => h.ascii(s)],
    ['SET', (s) => h.set(s)],
    ['RADIX', (s) => h.radix(s)],
    ['ADC', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0x69, lp),
        (lp) => h.zeroPage(0x65, lp),
        (lp) => h.zeroPageX(0x75, lp),
        (lp) => h.absolute(0x6D, lp),
        (lp) => h.absoluteX(0x7D, lp),
        (lp) => h.absoluteY(0x79, lp),
        (lp) => h.indirectX(0x61, lp),
        (lp) => h.indirectY(0x71, lp),
      ])
    ],
    ['AND', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0x29, lp),
        (lp) => h.zeroPage(0x25, lp),
        (lp) => h.zeroPageX(0x35, lp),
        (lp) => h.absolute(0x2D, lp),
        (lp) => h.absoluteX(0x3D, lp),
        (lp) => h.absoluteY(0x29, lp),
        (lp) => h.indirectX(0x21, lp),
        (lp) => h.indirectY(0x31, lp),
      ])
    ],
    ['ASL', (s) =>
      h.opcode(s, [
        (lp) => h.accumulator(0x0A, lp),
        (lp) => h.zeroPage(0x06, lp),
        (lp) => h.zeroPageX(0x16, lp),
        (lp) => h.absolute(0x0E, lp),
        (lp) => h.absoluteX(0x1E, lp),
      ])
    ],
    ['BCC', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0x90, lp),
      ])
    ],
    ['BCS', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0xB0, lp),
      ])
    ],
    ['BEQ', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0xF0, lp),
      ])
    ],
    ['BIT', (s) =>
      h.opcode(s, [
        (lp) => h.zeroPage(0x24, lp),
        (lp) => h.absolute(0x2C, lp),
      ])
    ],
    ['BMI', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0x30, lp),
      ])
    ],
    ['BNE', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0xD0, lp),
      ])
    ],
    ['BPL', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0x10, lp),
      ])
    ],
    ['BRK', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x00, lp),
      ])
    ],
    ['BVC', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0x50, lp),
      ])
    ],
    ['BVS', (s) =>
      h.opcode(s, [
        (lp) => h.relative(0x70, lp),
      ])
    ],
    ['CLC', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x18, lp),
      ])
    ],
    ['CLD', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xD8, lp),
      ])
    ],
    ['CLI', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x58, lp),
      ])
    ],
    ['CLV', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xB8, lp),
      ])
    ],
    ['CMP', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xC9, lp),
        (lp) => h.zeroPage(0xC5, lp),
        (lp) => h.zeroPageX(0xD5, lp),
        (lp) => h.absolute(0xCD, lp),
        (lp) => h.absoluteX(0xDD, lp),
        (lp) => h.absoluteY(0xD9, lp),
        (lp) => h.indirectX(0xC1, lp),
        (lp) => h.indirectY(0xD1, lp),
      ])
    ],
    ['CPX', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xE0, lp),
        (lp) => h.zeroPage(0xE4, lp),
        (lp) => h.absolute(0xEC, lp),
      ])
    ],
    ['CPY', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xC0, lp),
        (lp) => h.zeroPage(0xC4, lp),
        (lp) => h.absolute(0xCC, lp),
      ])
    ],
    ['DEC', (s) =>
      h.opcode(s, [
        (lp) => h.zeroPage(0xC6, lp),
        (lp) => h.zeroPageX(0xD6, lp),
        (lp) => h.absolute(0xCE, lp),
        (lp) => h.absoluteX(0xDE, lp),
      ])
    ],
    ['DEX', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xCA, lp),
      ])
    ],
    ['DEY', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x88, lp),
      ])
    ],
    ['EOR', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0x49, lp),
        (lp) => h.zeroPage(0x45, lp),
        (lp) => h.zeroPageX(0x55, lp),
        (lp) => h.absolute(0x4D, lp),
        (lp) => h.absoluteX(0x5D, lp),
        (lp) => h.absoluteY(0x59, lp),
        (lp) => h.indirectX(0x41, lp),
        (lp) => h.indirectY(0x51, lp),
      ])
    ],
    ['INC', (s) =>
      h.opcode(s, [
        (lp) => h.zeroPage(0xE6, lp),
        (lp) => h.zeroPageX(0xF6, lp),
        (lp) => h.absolute(0xEE, lp),
        (lp) => h.absoluteX(0xFE, lp),
      ])
    ],
    ['INX', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xE8, lp),
      ])
    ],
    ['INY', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xC8, lp),
      ])
    ],
    ['JMP', (s) =>
      h.opcode(s, [
        (lp) => h.absolute(0x4C, lp),
        (lp) => h.indirect(0x6C, lp),
      ])
    ],
    ['JSR', (s) =>
      h.opcode(s, [
        (lp) => h.absolute(0x20, lp),
      ])
    ],
    ['LDA', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xA9, lp),
        (lp) => h.zeroPage(0xA5, lp),
        (lp) => h.zeroPageX(0xB5, lp),
        (lp) => h.absolute(0xAD, lp),
        (lp) => h.absoluteX(0xBD, lp),
        (lp) => h.absoluteY(0xB9, lp),
        (lp) => h.indirectX(0xA1, lp),
        (lp) => h.indirectY(0xB1, lp),
      ])
    ],
    ['LDX', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xA2, lp),
        (lp) => h.zeroPage(0xA6, lp),
        (lp) => h.zeroPageY(0xB6, lp),
        (lp) => h.absolute(0xAE, lp),
        (lp) => h.absoluteY(0xBE, lp),
      ])
    ],
    ['LDY', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xA0, lp),
        (lp) => h.zeroPage(0xA4, lp),
        (lp) => h.zeroPageX(0xB4, lp),
        (lp) => h.absolute(0xAC, lp),
        (lp) => h.absoluteX(0xBC, lp),
      ])
    ],
    ['LSR', (s) =>
      h.opcode(s, [
        (lp) => h.accumulator(0x4A, lp),
        (lp) => h.zeroPage(0x46, lp),
        (lp) => h.zeroPageX(0x56, lp),
        (lp) => h.absolute(0x4E, lp),
        (lp) => h.absoluteX(0x5E, lp),
      ])
    ],
    ['NOP', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xEA, lp),
      ])
    ],
    ['ORA', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0x09, lp),
        (lp) => h.zeroPage(0x05, lp),
        (lp) => h.zeroPageX(0x15, lp),
        (lp) => h.absolute(0x0D, lp),
        (lp) => h.absoluteX(0x1D, lp),
        (lp) => h.absoluteY(0x19, lp),
        (lp) => h.indirectX(0x01, lp),
        (lp) => h.indirectY(0x11, lp),
      ])
    ],
    ['PHA', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x48, lp),
      ])
    ],
    ['PHP', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x08, lp),
      ])
    ],
    ['PLA', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x68, lp),
      ])
    ],
    ['PLP', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x28, lp),
      ])
    ],
    ['ROL', (s) =>
      h.opcode(s, [
        (lp) => h.accumulator(0x2A, lp),
        (lp) => h.zeroPage(0x26, lp),
        (lp) => h.zeroPageX(0x36, lp),
        (lp) => h.absolute(0x2E, lp),
        (lp) => h.absoluteX(0x3E, lp),
      ])
    ],
    ['ROR', (s) =>
      h.opcode(s, [
        (lp) => h.accumulator(0x6A, lp),
        (lp) => h.zeroPage(0x66, lp),
        (lp) => h.zeroPageX(0x76, lp),
        (lp) => h.absolute(0x6E, lp),
        (lp) => h.absoluteX(0x7E, lp),
      ])
    ],
    ['RTI', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x40, lp),
      ])
    ],
    ['RTS', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x60, lp),
      ])
    ],
    ['SBC', (s) =>
      h.opcode(s, [
        (lp) => h.immediate(0xE9, lp),
        (lp) => h.zeroPage(0xE5, lp),
        (lp) => h.zeroPageX(0xF5, lp),
        (lp) => h.absolute(0xED, lp),
        (lp) => h.absoluteX(0xFD, lp),
        (lp) => h.absoluteY(0xF9, lp),
        (lp) => h.indirectX(0xE1, lp),
        (lp) => h.indirectY(0xF1, lp),
      ])
    ],
    ['SEC', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x38, lp),
      ])
    ],
    ['SED', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xF8, lp),
      ])
    ],
    ['SEI', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x78, lp),
      ])
    ],
    ['STA', (s) =>
      h.opcode(s, [
        (lp) => h.zeroPage(0x85, lp),
        (lp) => h.zeroPageX(0x95, lp),
        (lp) => h.absolute(0x8D, lp),
        (lp) => h.absoluteX(0x9D, lp),
        (lp) => h.absoluteY(0x99, lp),
        (lp) => h.indirectX(0x81, lp),
        (lp) => h.indirectY(0x91, lp),
      ])
    ],
    ['STX', (s) =>
      h.opcode(s, [
        (lp) => h.zeroPage(0x86, lp),
        (lp) => h.zeroPageY(0x96, lp),
        (lp) => h.absolute(0x8E, lp),
      ])
    ],
    ['STY', (s) =>
      h.opcode(s, [
        (lp) => h.zeroPage(0x84, lp),
        (lp) => h.zeroPageX(0x94, lp),
        (lp) => h.absolute(0x8C, lp),
      ])
    ],
    ['TAX', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xAA, lp),
      ])
    ],
    ['TAY', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xA8, lp),
      ])
    ],
    ['TSX', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0xBA, lp),
      ])
    ],
    ['TXA', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x8A, lp),
      ])
    ],
    ['TXS', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x9A, lp),
      ])
    ],
    ['TYA', (s) =>
      h.opcode(s, [
        (lp) => h.implied(0x98, lp),
      ])
    ],
  ]);
}
