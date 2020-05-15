#!/usr/bin/env node
'use strict'
const meow = require('meow')
const { jestBranchCoverage } = require('../lib')

const cli = meow(
  `
Usage
    $ branch-coverage <branch-name>

    Options
	  --origin, -o  Branch to compare against (default 'master')
`,
  {
    flags: {
      origin: {
        type: 'string',
        alias: 'o',
      },
    },
  }
)

jestBranchCoverage(cli.input[0], cli.flags.origin)
