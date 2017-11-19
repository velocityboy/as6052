// @flow

import fs from 'fs';
import {sprintf} from 'sprintf-js';

export default class ObjectCode {
  _code: number[];

  constructor() {
    this._code = Array(0x10000).fill(-1);
  }

  set(at: number, bytes: number[]): void {
    for (const b of bytes) {
      this._code[at] = b;
      at++;
    }
  }

  writeObjectFile(filename: string): void {
    let code = this._code.slice(0);
    let fd = fs.openSync(filename, 'w', 0o666);

    let addr = 0;
    while (code.length > 0) {
      let index = code.findIndex(_ => _ !== -1);
      if (index === -1) {
        break;
      }

      addr += index;
      code.splice(0, index);

      fs.writeSync(fd, `@${sprintf('%04X', addr)}\n`);

      let out = 0;
      let line = '';
      let i = 0;
      for (i = 0; i < code.length && code[i] !== -1; i++) {
        line += sprintf('%02X', code[i]);
        out++;
        if (out == 16) {
          fs.writeSync(fd, `${line}\n`);
          line = '';
          out = 0;
        } else {
          line += ' ';
        }
      }

      if (out > 0) {
        fs.writeSync(fd, `${line}\n`);
      }

      addr += i;
      code.splice(0, i);
    }
  }
}
