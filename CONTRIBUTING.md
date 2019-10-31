# Contribution Guidelines

## Rationale

JMESPath itself is a group of related projects implementing the same specification
in different languages.

This is a fork of the original JavaScript implementation (jmespath.js), hosted at
[Github](https://github.com/jmespath/jmespath.js)). It is maintained by
[GorillaStack](https://www.gorillastack.com).

From what we can ascertain, the original specification has not been maintained for
some years and the JavaScript fork has not accepted patches or responded to issues
for some time (Some of the other language implementations do appear to be maintained).
We believe this project is still useful, so we are making improvements and
fixing bugs in this copy of the code.

## Contributing to this project

> Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By
> participating in this project you agree to abide by its terms.

### Opening issues

You should include:

- your JavaScript interpreter details i.e. nodejs version or browser version
- an example JMESPath expression that reproduces your issue
- an associated JSON example that is used by your expression
- any other relevant information

**NOTE**: We are only maintaining the JavaScript fork at this time - issues in
implementations for other languages (C#, Java, Python, etc.) should be directed
at the relevant repository (see our [documentation site](https://gorillstack-jmespath.netlify.com)
for a list of links for each language implementation).

### Bug fixes

Please open a pull request with a description of the bug or a link to an issue
as well as you code. Include updates to the compliance or test suite (where
appropriate) that demonstrate the fix to your issue.

### New functionality

*NOTE: We are not the original maintainers of the specification, but we are making*
*adding to it in our fork to support new functionality.*

To make it easier for those who may want to adapt our additions for other
implementations, we require you to write up a specification, in addition to
your JavaScript implementation. This process allows other language maintainers
of jmespath to add your changes to their language.

1. First, start by taking a copy of the GorillaStack [jmespath.site repository](https://github.com/GorillaStack/jmespath.site)
  and adding a proposal to the `docs/proposals` directory. Follow the format
  of existing proposals (Title, Abstract, Motivations, Syntax) and link to
  it in the `docs/proposals.rst` file. Open a PR on the [jmespath.site repository](https://github.com/GorillaStack/jmespath.site)
2. Open a PR on this repository with a working implementation. You will need
  to update `/jmespath.js` and add test cases to the `test/compliance` directory
  that validate your spec additions (these are important for other langugage
  maintainers that use the same compliance suite).
3. We may provide feedback or request additional changes to your PRs to accept
  them.
4. When they are ready, we'll get you to submit an additional PR to the specification
  that describes your new additions. They should be correctly flagged as
  diversions from the original specification unique to the JavaScript
  implementation.
