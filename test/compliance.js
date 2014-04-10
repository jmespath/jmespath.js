var fs = require('fs');
var path = require('path');
var assert = require('assert');
var jmespath = require('../jmespath');
var search = jmespath.search;

// pipe.json is actually implemented, but the compliance test requires
// function support so the tests aren't run for now.
var notImplementedYet = ['filters.json', 'functions.json', 'pipe.json', 'syntax.json'];

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// TODO: will need to figure out how to make this not dependent on cwd.
var listing = fs.readdirSync('test/compliance');
for (var i = 0; i < listing.length; i++) {
    var filename = 'test/compliance/' + listing[i];
    if (fs.statSync(filename).isFile() && endsWith(filename, '.json') &&
        notImplementedYet.indexOf(path.basename(filename)) === -1) {
        addTestSuitesFromFile(filename);
    }
}
function addTestSuitesFromFile(filename) {
    describe(filename, function() {
        var spec = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        for (var i = 0; i < spec.length; i++) {
            var msg = "suite " + i + " for filename " + filename;
            describe(msg, function() {
                var given = spec[i].given;
                var cases = spec[i].cases;
                for (var j = 0; j < cases.length; j++) {
                    var testcase = cases[j];
                    if (testcase.error !== undefined) {
                        // TODO: implement error tests.
                    } else {
                        (function(testcase, given) {
                          it('should pass test ' + j, function() {
                              console.log(testcase);
                              assert.deepEqual(search(given, testcase.expression),
                                               testcase.result);
                          });
                        })(testcase, given);
                    }
                }
            });
        }
    });
}
