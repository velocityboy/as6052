// @flow

import {sprintf} from 'sprintf-js';
import ListingMarker from './ListingMarker';

export type ListLine = {
  lineNumber?: number,
  address?: number,
  label?: string,
  bytes?: number[],
  opcode?: string,
  operands?: string,
  comment?: string,
};

// 000000000011111111112222222222333333333344444444445555555555666
// 012345678901234567890123456789012345678901234567890123456789012
// 00001 FFFF LABELA: 4C 34 12    JMP    $1234                   ; comments
//   5  1  4 1  7    1       12  1   6  1           24
export default class Listing {
  _lines: string[] = [];
  _markers: ListingMarker[] = [];

  addLine(line: ListLine): void {
    const out = this.formatLine(line);
    this._addOutputLine(out, this._lines.length);
  }

  replaceLineBefore(line: ListLine, marker: ListingMarker): void {
    const out = this.formatLine(line);
    this._lines[marker._insertionPoint - 1] = out;
  }

  formatLine(line: ListLine): string {
    let out: string = '';

    let {lineNumber, address, label, bytes, opcode, operands, comment} = line;

    if (bytes != null) {
      bytes = bytes.slice();
    }

    if (lineNumber != null) {
      out += sprintf('%5d ', lineNumber);
    } else {
      out += ' '.repeat(6);
    }

    if (address == null && label == null && bytes == null && opcode == null && operands == null) {
      // comment only line
      if (comment != null) {
        out += comment;
      }
    } else {
      if (address != null) {
        out += sprintf('%04X ', address);
      } else {
        out += ' '.repeat(5);
      }

      if (label != null) {
        const labelOut = label + ':';
        out += sprintf('%-7s ', labelOut);
      } else {
        out += ' '.repeat(8);
      }

      if (bytes != null && bytes.length > 0) {
        let bytesInRow = Math.min(bytes.length, 4);
        let bytesToPrint =
          bytes
            .slice(0, bytesInRow)
            .map(_ => sprintf('%02X', _))
            .join(' ');
        bytes = bytes.splice(0, bytesInRow);
        out += sprintf('%-12s ', bytesToPrint);
      } else {
        out += ' '.repeat(13);
      }

      out += sprintf('%-6s ', Listing._nullToEmpty(opcode));
      out += sprintf('%-24s ', Listing._nullToEmpty(operands));
      out += Listing._nullToEmpty(comment);
    }

    return out;

    // $TODO leftover bytes
  }

  addError(lineNumber: number, error: string): void {
    this._addOutputLine(sprintf('%5dE %s\n', lineNumber, error), this._lines.length);
  }

  printListing(): void {
    process.stdout.write(this._lines.join('\n') + '\n');
  }

  getInsertionPoint(): ListingMarker {
    const marker = new ListingMarker(this._lines.length);
    this._markers.push(marker);
    return marker;
  }

  _addOutputLine(line: string, index: number): void {
    this._lines.splice(index, 0, line);
    this._markers
      .filter(_ => _.insertionPoint > index)
      .map(_ => _.increment());
  }

  static _nullToEmpty(s: ?string): string {
    return s == null ? '' : s;
  }
};
