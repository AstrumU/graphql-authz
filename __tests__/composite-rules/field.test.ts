import { ApolloServerMock, mockServer } from '../mock-server';
import {
  inlineRules,
  rules,
  functionalRules,
  inlineSchemaRules
} from './rules';

const rawSchema = `
  type TestObject {
    failingAndRuleField: String @authz(rules: [FailingAndRule])
    passingAndRuleField: String @authz(rules: [PassingAndRule])
    failingOrRuleField: String @authz(rules: [FailingOrRule])
    passingOrRuleField: String @authz(rules: [PassingOrRule])
    failingNotRuleField: String @authz(rules: [FailingNotRule])
    passingNotRuleField: String @authz(rules: [PassingNotRule])
    failingDeepAndRuleField: String @authz(rules: [FailingDeepAndRule])
    passingDeepAndRuleField: String @authz(rules: [PassingDeepAndRule])
    failingDeepOrRuleField: String @authz(rules: [FailingDeepOrRule])
    passingDeepOrRuleField: String @authz(rules: [PassingDeepOrRule])
    failingDeepNotRuleField: String @authz(rules: [FailingDeepNotRule])
    passingDeepNotRuleField: String @authz(rules: [PassingDeepNotRule])

    failingAndRuleInlineField: String @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    passingAndRuleInlineField: String @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    failingOrRuleInlineField: String @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    passingOrRuleInlineField: String @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    failingNotRuleInlineField: String @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    passingNotRuleInlineField: String @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    failingDeepAndRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    passingDeepAndRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    failingDeepOrRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    passingDeepOrRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    failingDeepNotRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    passingDeepNotRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])

    failingAndRuleListField: [String] @authz(rules: [FailingAndRule])
    passingAndRuleListField: [String] @authz(rules: [PassingAndRule])
    failingOrRuleListField: [String] @authz(rules: [FailingOrRule])
    passingOrRuleListField: [String] @authz(rules: [PassingOrRule])
    failingNotRuleListField: [String] @authz(rules: [FailingNotRule])
    passingNotRuleListField: [String] @authz(rules: [PassingNotRule])
    failingDeepAndRuleListField: [String] @authz(rules: [FailingDeepAndRule])
    passingDeepAndRuleListField: [String] @authz(rules: [PassingDeepAndRule])
    failingDeepOrRuleListField: [String] @authz(rules: [FailingDeepOrRule])
    passingDeepOrRuleListField: [String] @authz(rules: [PassingDeepOrRule])
    failingDeepNotRuleListField: [String] @authz(rules: [FailingDeepNotRule])
    passingDeepNotRuleListField: [String] @authz(rules: [PassingDeepNotRule])

    failingAndRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    passingAndRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    failingOrRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    passingOrRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    failingNotRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    passingNotRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    failingDeepAndRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    passingDeepAndRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    failingDeepOrRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    passingDeepOrRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    failingDeepNotRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    passingDeepNotRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])
  }

  type Query {
    testQuery: TestObject
  }
`;

const rawSchemaWithoutDirectives = `
  type TestObject {
    failingAndRuleField: String
    passingAndRuleField: String
    failingOrRuleField: String
    passingOrRuleField: String
    failingNotRuleField: String
    passingNotRuleField: String
    failingDeepAndRuleField: String
    passingDeepAndRuleField: String
    failingDeepOrRuleField: String
    passingDeepOrRuleField: String
    failingDeepNotRuleField: String
    passingDeepNotRuleField: String

    failingAndRuleInlineField: String
    passingAndRuleInlineField: String
    failingOrRuleInlineField: String
    passingOrRuleInlineField: String
    failingNotRuleInlineField: String
    passingNotRuleInlineField: String
    failingDeepAndRuleInlineField: String
    passingDeepAndRuleInlineField: String
    failingDeepOrRuleInlineField: String
    passingDeepOrRuleInlineField: String
    failingDeepNotRuleInlineField: String
    passingDeepNotRuleInlineField: String

    failingAndRuleListField: [String]
    passingAndRuleListField: [String]
    failingOrRuleListField: [String]
    passingOrRuleListField: [String]
    failingNotRuleListField: [String]
    passingNotRuleListField: [String]
    failingDeepAndRuleListField: [String]
    passingDeepAndRuleListField: [String]
    failingDeepOrRuleListField: [String]
    passingDeepOrRuleListField: [String]
    failingDeepNotRuleListField: [String]
    passingDeepNotRuleListField: [String]

    failingAndRuleInlineListField: [String]
    passingAndRuleInlineListField: [String]
    failingOrRuleInlineListField: [String]
    passingOrRuleInlineListField: [String]
    failingNotRuleInlineListField: [String]
    passingNotRuleInlineListField: [String]
    failingDeepAndRuleInlineListField: [String]
    passingDeepAndRuleInlineListField: [String]
    failingDeepOrRuleInlineListField: [String]
    passingDeepOrRuleInlineListField: [String]
    failingDeepNotRuleInlineListField: [String]
    passingDeepNotRuleInlineListField: [String]
  }

  type Query {
    testQuery: TestObject
  }
`;

const authSchema = {
  TestObject: {
    failingAndRuleField: { __authz: { rules: ['FailingAndRule'] } },
    passingAndRuleField: { __authz: { rules: ['PassingAndRule'] } },
    failingOrRuleField: { __authz: { rules: ['FailingOrRule'] } },
    passingOrRuleField: { __authz: { rules: ['PassingOrRule'] } },
    failingNotRuleField: { __authz: { rules: ['FailingNotRule'] } },
    passingNotRuleField: { __authz: { rules: ['PassingNotRule'] } },
    failingDeepAndRuleField: { __authz: { rules: ['FailingDeepAndRule'] } },
    passingDeepAndRuleField: { __authz: { rules: ['PassingDeepAndRule'] } },
    failingDeepOrRuleField: { __authz: { rules: ['FailingDeepOrRule'] } },
    passingDeepOrRuleField: { __authz: { rules: ['PassingDeepOrRule'] } },
    failingDeepNotRuleField: { __authz: { rules: ['FailingDeepNotRule'] } },
    passingDeepNotRuleField: { __authz: { rules: ['PassingDeepNotRule'] } },

    failingAndRuleInlineField: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingAndRuleInlineSchema]
      }
    },
    passingAndRuleInlineField: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingAndRuleInlineSchema]
      }
    },
    failingOrRuleInlineField: {
      __authz: { compositeRules: [inlineSchemaRules.failingOrRuleInlineSchema] }
    },
    passingOrRuleInlineField: {
      __authz: { compositeRules: [inlineSchemaRules.passingOrRuleInlineSchema] }
    },
    failingNotRuleInlineField: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingNotRuleInlineSchema]
      }
    },
    passingNotRuleInlineField: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingNotRuleInlineSchema]
      }
    },
    failingDeepAndRuleInlineField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepAndRuleInlineSchema]
      }
    },
    passingDeepAndRuleInlineField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepAndRuleInlineSchema]
      }
    },
    failingDeepOrRuleInlineField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepOrRuleInlineSchema]
      }
    },
    passingDeepOrRuleInlineField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepOrRuleInlineSchema]
      }
    },
    failingDeepNotRuleInlineField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepNotRuleInlineSchema]
      }
    },
    passingDeepNotRuleInlineField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepNotRuleInlineSchema]
      }
    },

    failingAndRuleListField: { __authz: { rules: ['FailingAndRule'] } },
    passingAndRuleListField: { __authz: { rules: ['PassingAndRule'] } },
    failingOrRuleListField: { __authz: { rules: ['FailingOrRule'] } },
    passingOrRuleListField: { __authz: { rules: ['PassingOrRule'] } },
    failingNotRuleListField: { __authz: { rules: ['FailingNotRule'] } },
    passingNotRuleListField: { __authz: { rules: ['PassingNotRule'] } },
    failingDeepAndRuleListField: { __authz: { rules: ['FailingDeepAndRule'] } },
    passingDeepAndRuleListField: { __authz: { rules: ['PassingDeepAndRule'] } },
    failingDeepOrRuleListField: { __authz: { rules: ['FailingDeepOrRule'] } },
    passingDeepOrRuleListField: { __authz: { rules: ['PassingDeepOrRule'] } },
    failingDeepNotRuleListField: { __authz: { rules: ['FailingDeepNotRule'] } },
    passingDeepNotRuleListField: { __authz: { rules: ['PassingDeepNotRule'] } },

    failingAndRuleInlineListField: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingAndRuleInlineSchema]
      }
    },
    passingAndRuleInlineListField: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingAndRuleInlineSchema]
      }
    },
    failingOrRuleInlineListField: {
      __authz: { compositeRules: [inlineSchemaRules.failingOrRuleInlineSchema] }
    },
    passingOrRuleInlineListField: {
      __authz: { compositeRules: [inlineSchemaRules.passingOrRuleInlineSchema] }
    },
    failingNotRuleInlineListField: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingNotRuleInlineSchema]
      }
    },
    passingNotRuleInlineListField: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingNotRuleInlineSchema]
      }
    },
    failingDeepAndRuleInlineListField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepAndRuleInlineSchema]
      }
    },
    passingDeepAndRuleInlineListField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepAndRuleInlineSchema]
      }
    },
    failingDeepOrRuleInlineListField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepOrRuleInlineSchema]
      }
    },
    passingDeepOrRuleInlineListField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepOrRuleInlineSchema]
      }
    },
    failingDeepNotRuleInlineListField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepNotRuleInlineSchema]
      }
    },
    passingDeepNotRuleInlineListField: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepNotRuleInlineSchema]
      }
    }
  }
};

describe.each(['directive', 'authSchema'] as const)('%s', declarationMode => {
  describe.each([
    ['', rules],
    ['functional', functionalRules]
  ])('%s', (name, rules) => {
    describe('Composite rules', () => {
      let server: ApolloServerMock;

      beforeAll(async () => {
        server = mockServer({
          rules,
          rawSchema,
          rawSchemaWithoutDirectives,
          declarationMode,
          authSchema
        });

        await server.willStart();
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      describe.each([
        'failingAndRule',
        'passingAndRule',
        'failingOrRule',
        'passingOrRule',
        'failingNotRule',
        'passingNotRule',
        'failingDeepAndRule',
        'passingDeepAndRule',
        'failingDeepOrRule',
        'passingDeepOrRule',
        'failingDeepNotRule',
        'passingDeepNotRule'
      ])('%s', ruleName => {
        describe.each(['', 'Inline'])('%s', ruleVariant => {
          describe.each(['', 'List'])('%s', resultVariant => {
            it('should fail on failing rules and not fail on passing rules', async () => {
              let result;
              let error;
              try {
                result = await server.executeOperation({
                  query: `query Test {
                      testQuery {
                        ${ruleName}${ruleVariant}${resultVariant}Field
                      }
                    }`
                });
              } catch (e) {
                error = e;
              }

              if (ruleName.startsWith('failing')) {
                const requestError = error || result?.errors?.[0];
                expect(requestError).toBeDefined();
                expect(requestError.extensions.code).toEqual('FORBIDDEN');
              } else {
                expect(result).toBeDefined();
                expect(result?.data?.testQuery).toHaveProperty(
                  `${ruleName}${ruleVariant}${resultVariant}Field`
                );
                const fieldData =
                  result?.data?.testQuery[
                    `${ruleName}${ruleVariant}${resultVariant}Field`
                  ];
                expect(
                  typeof (resultVariant === 'List' ? fieldData[0] : fieldData)
                ).toEqual('string');
              }
            });
          });
        });
      });
    });
  });
});
