fs = require 'fs'
astTest = []
complianceTests = fs.readdirSync('./test/compliance/')
{compile} = require('./')
for test in complianceTests
  unless test is 'ast.json'
    tests = require "./test/compliance/#{test}"
    for test in tests
      if test?.cases?
        cases = []
        for testCase, i in test.cases
          unless testCase?.error?
            testCase.expression = compile testCase.expression
            cases.push testCase
        if test?.cases?.length > 0
          test.cases = cases
          astTest.push test

fs.writeFile './test/compliance/ast.json', JSON.stringify(astTest, null, 2), () ->
  process.exit()
