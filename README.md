# jmespath.ts

jmespath.ts is a TypeScript implementation of JMESPath, which is a query
language for JSON. It will take a JSON document and transform it into another
JSON document through a JMESPath expression.

Using jmespath.ts is really easy. There's a single class you use, `JmesPath`:

```ts
import { JmesPath } from "jsr:@halvardm/jmespath";

const jp = new JmesPath({ foo: { bar: { baz: [0, 1, 2, 3, 4] } } });
console.log(jp.search("foo.bar.baz[2]")); // 2
```

The JMESPath language can do a lot more than select an element from a list. Here
are a few more examples:

```ts
import { JmesPath } from "jsr:@halvardm/jmespath";

const jp = new JmesPath({ foo: { bar: { baz: [0, 1, 2, 3, 4] } } });
console.log(jp.search("foo.bar"));
// { baz: [ 0, 1, 2, 3, 4 ] }

const jp = new JmesPath({
  foo: [
    { first: "a", last: "b" },
    { first: "c", last: "d" },
  ],
});
console.log(jp.search("foo[*].first"));
// [ 'a', 'c' ]

const jp = new JmesPath({
  foo: [{ age: 20 }, { age: 25 }, { age: 30 }, { age: 35 }, { age: 40 }],
});
console.log(jp.search("foo[?age > `30`]"));
// [ { age: 35 }, { age: 40 } ]
```

## More Resources

The example above only show a small amount of what a JMESPath expression can do.
If you want to take a tour of the language, the _best_ place to go is the
[JMESPath Tutorial](http://jmespath.org/tutorial.html).

One of the best things about JMESPath is that it is implemented in many
different programming languages including python, ruby, php, lua, etc. To see a
complete list of libraries, check out the
[JMESPath libraries page](http://jmespath.org/libraries.html).

And finally, the full JMESPath specification can be found on the
[JMESPath site](http://jmespath.org/specification.html).
