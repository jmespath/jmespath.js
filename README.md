# jmespath.js

[![Build Status](https://travis-ci.org/jmespath/jmespath.js.png?branch=master)](https://travis-ci.org/jmespath/jmespath.js)

jmespath.js is a javascript implementation of JMESPath,
which is a query language for JSON.  It will take a JSON
document and transform it into another JSON document
through a JMESPath expression.

Using jmespath.js is really easy.  There's a single function
you use, `jmespath.search`:

```js
var jmespath = require('jmespath');
jmespath.search({foo: {bar: {baz: [0, 1, 2, 3, 4]}}}, "foo.bar.baz[2]")

// output = 2
```

In the example we gave the ``search`` function input data of
`{foo: {bar: {baz: [0, 1, 2, 3, 4]}}}` as well as the JMESPath
expression `foo.bar.baz[2]`, and the `search` function evaluated
the expression against the input data to produce the result ``2``.

The JMESPath language can do a lot more than select an element
from a list.  Here are a few more examples:

```js
jmespath.search({foo: {bar: {baz: [0, 1, 2, 3, 4]}}}, "foo.bar")

// { baz: [ 0, 1, 2, 3, 4 ] }

jmespath.search({"foo": [{"first": "a", "last": "b"},
                           {"first": "c", "last": "d"}]},
                  "foo[*].first")

// [ 'a', 'c' ]

jmespath.search({"foo": [{"age": 20}, {"age": 25},
                           {"age": 30}, {"age": 35},
                           {"age": 40}]},
                  "foo[?age > `30`]")

// [ { age: 35 }, { age: 40 } ]
```

## Adding custom functions

Custom functions can be added to the JMESPath runtime by using the
`decorate()` function:

```js
var TYPE_NUMBER = 0;
function customFunc(resolvedArgs) {
  return resolvedArgs[0] + 99;
}
var extraFunctions = {
  custom: {_func: customFunc, _signature: [{types: [TYPE_NUMBER]}]},
};
jmespath.decorate(extraFunctions);
```

The value returned by the decorate function is a curried function
(takes arguments one at a time) that takes the search expression 
first and then the data to search against as the second parameter:

```js
var value = jmespath.decorate(extraFunctions)('custom(`1`)')({})
// value = 100
```

Because the return value from `decorate()` is a curried function
the result of compiling the expression can be cached and run 
multiple times against different data:

```js
var expr = jmespath.decorate({})('a');
// expr is now a cached compiled version of the search expression
var value = expr({ a: 1 });
assert.strictEqual(value, 1);
value = expr({ a: 2 });
assert.strictEqual(value, 2);
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
