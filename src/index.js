#!/usr/bin/env node

// @flow

import yargs from 'yargs';
import Assembler from './Assembler';

const args = yargs.argv._;
if (args.length < 1) {
  console.error('as6052: filename');
  process.exit(1)
}

const assembler = new Assembler(args[0]);
assembler.assemble();
