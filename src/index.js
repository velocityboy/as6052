#!/usr/bin/env node

// @flow

import yargs from 'yargs';
import Assembler from './Assembler';
import replaceExt from 'replace-ext';
import fs from 'fs';

export {Assembler};

const args = yargs.argv._;
if (args.length < 1) {
  console.error('as6052: filename');
  process.exit(1)
}

let sourceBlob: string = '';
try {
  sourceBlob = fs.readFileSync(args[0], 'utf8');
} catch (error) {
  console.error(`Could not open file ${args[0]}`);
  process.exit(1);
}

const source: string[] = sourceBlob.split(/\r\n|\r|\n/);

const assembler = new Assembler(source);
const result = assembler.assemble();

result.listing.printListing();

const objFile = replaceExt(args[0], '.OBJ');
result.objectCode.writeObjectFile(objFile);
