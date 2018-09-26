# jmespath.js

[![Build Status](https://travis-ci.org/jmespath/jmespath.js.png?branch=master)](https://travis-ci.org/jmespath/jmespath.js)

jmespath.js is a javascript implementation of JMESPath,
which is a query language for JSON.  It will take a JSON
document and transform it into another JSON document
through a JMESPath expression.

Using jmespath.js is really easy.  There's a single function
you use, `jmespath.search`:


```
> var jmespath = require('jmespath');
> await jmespath.search({foo: {bar: {baz: [0, 1, 2, 3, 4]}}}, "foo.bar.baz[2]")
2
```

In the example we gave the ``search`` function input data of
`{foo: {bar: {baz: [0, 1, 2, 3, 4]}}}` as well as the JMESPath
expression `foo.bar.baz[2]`, and the `search` function evaluated
the expression against the input data to produce the result ``2``.

The JMESPath language can do a lot more than select an element
from a list.  Here are a few more examples:

```
> await jmespath.search({foo: {bar: {baz: [0, 1, 2, 3, 4]}}}, "foo.bar")
{ baz: [ 0, 1, 2, 3, 4 ] }

> await jmespath.search({"foo": [{"first": "a", "last": "b"},
                           {"first": "c", "last": "d"}]},
                  "foo[*].first")
[ 'a', 'c' ]

> await jmespath.search({"foo": [{"age": 20}, {"age": 25},
                           {"age": 30}, {"age": 35},
                           {"age": 40}]},
                  "foo[?age > `30`]")
[ { age: 35 }, { age: 40 } ]
```

## More Resources

The example above only show a small amount of what
a JMESPath expression can do.  If you want to take a
tour of the language, the *best* place to go is the
[JMESPath Tutorial](http://jmespath.org/tutorial.html).

One of the best things about JMESPath is that it is
implemented in many different programming languages including
python, ruby, php, lua, etc.  To see a complete list of libraries,
check out the [JMESPath libraries page](http://jmespath.org/libraries.html).

And finally, the full JMESPath specification can be found
on the [JMESPath site](http://jmespath.org/specification.html).

## Custom Filter Functions

As an extension to common JMESPath API and available in jmespath.js only,  
custom filter functions can be specified through the ``functionTable`` 
property of the optional third argument of the ``search`` function. 
A custom function can even call third-party 
libraries via closure. Custom functions can by asynchronous. The following example shows how a custom async filter function `contains_ci` is implemented with 
[`lodash`](https://lodash.com/) library to provide case insensitive string matching

```
const jmespath = require('jmespath')
const assert = require('assert')
const _ = require('lodash')
let res = jmespath.search([{ a: 'foo' }], "[?contains_ci(a, 'FOO')]", {
            functionTable: {
              /*jshint camelcase: false */
              contains_ci: {
                _func: async function(resolvedArgs) {
                  if (!resolvedArgs[0] || !resolvedArgs[1]) {
                    return false
                  }
                  return new Promise(resolve => {
                    setTimeout(() => {
                      resolve(_.toLower(resolvedArgs[0]).indexOf(_.toLower(resolvedArgs[1])) >= 0)
                    }, 1000)
                  })
                },
                _signature: [
                  {
                    types: [2]
                  },
                  {
                    types: [2]
                  }
                ]
              }
            }
          })
res.then(val => assert.deepStrictEqual(val, [{ a: 'foo' }]))
```

See [type constants](https://github.com/jmespath/jmespath.js/blob/master/jmespath.js#L132) for type mapping used by the example.