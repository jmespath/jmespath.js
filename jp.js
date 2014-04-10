#!/usr/bin/env node
jmespath = require('./jmespath')

if (process.argv.length < 3) {
    console.log("Must provide a jmespath expression.");
    process.exit(1);
}
jmespath.compile(process.argv[2]);
console.log(JSON.stringify(jmespath.compile(process.argv[2]), null, 2));
console.log(JSON.stringify(jmespath.search(JSON.parse(process.argv[3]), process.argv[2])));
