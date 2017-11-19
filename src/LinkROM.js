#!/usr/bin/env node

// @flow

import fs from 'fs';
import path from 'path';
import replaceExt from 'replace-ext';

let [,program,filename,start,end] = process.argv;
const programName = path.parse(program).name;

if (filename == null || start == null || end == null) {
  process.stderr.write(`${programName}: link-rom filename start end\n`);
  process.exit(1);
}

start = parseInt(start, 16);
end = parseInt(end, 16);
if (isNaN(start) || isNaN(end)) {
  process.stderr.write(`${programName}: start and end must be hex numbers\n`);
  process.exit(1);
}

const lines: string[] = fs.readFileSync(filename, 'utf8').split('\n');

let at: number = 0;
let buffer: number[] = Array(0x10000).fill(0);
let count: number = 0;

for (let line of lines) {
  line = line.trim();

  const orgMatch = line.match(/^@([0-9a-fA-F]{4})$/);
  if (orgMatch != null) {
    const org = orgMatch[1];
    at = parseInt(org, 16);
    if (isNaN(at)) {
      process.stderr.write(`${programName}: invalid org value ${org}\n`);
      process.exit(1);
    }
    continue;
  }

  if (line === '') {
    continue;
  }

  const bytes = line.trim().split(/\s+/).map(_ => parseInt(_, 16));
  if (bytes.findIndex(isNaN) !== -1) {
    process.stderr.write(`${programName}: invalid data line '${line}'\n`);
    process.exit(1);
  }

  for (const byte of bytes) {
    buffer[at++] = byte;
  }
  count += bytes.length;
}

buffer = buffer.slice(start, end);
const romFile = replaceExt(filename, '.ROM');
fs.writeFileSync(romFile, new Buffer(buffer), 'binary');

process.stdout.write(`${count} bytes from object file.\n`)
