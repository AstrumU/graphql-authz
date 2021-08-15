import { ApolloServerMock, mockServer } from '../mock-server';
import {
  rules,
  inlineRules,
  functionalRules,
  inlineSchemaRules
} from './rules';

const rawSchema = `
  type Query {
    FailingAndRuleQuery: String @authz(rules: [FailingAndRule])
    PassingAndRuleQuery: String @authz(rules: [PassingAndRule])
    FailingOrRuleQuery: String @authz(rules: [FailingOrRule])
    PassingOrRuleQuery: String @authz(rules: [PassingOrRule])
    FailingNotRuleQuery: String @authz(rules: [FailingNotRule])
    PassingNotRuleQuery: String @authz(rules: [PassingNotRule])
    FailingDeepAndRuleQuery: String @authz(rules: [FailingDeepAndRule])
    PassingDeepAndRuleQuery: String @authz(rules: [PassingDeepAndRule])
    FailingDeepOrRuleQuery: String @authz(rules: [FailingDeepOrRule])
    PassingDeepOrRuleQuery: String @authz(rules: [PassingDeepOrRule])
    FailingDeepNotRuleQuery: String @authz(rules: [FailingDeepNotRule])
    PassingDeepNotRuleQuery: String @authz(rules: [PassingDeepNotRule])

    FailingAndRuleInlineQuery: String @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    PassingAndRuleInlineQuery: String @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    FailingOrRuleInlineQuery: String @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    PassingOrRuleInlineQuery: String @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    FailingNotRuleInlineQuery: String @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    PassingNotRuleInlineQuery: String @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    FailingDeepAndRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    PassingDeepAndRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    FailingDeepOrRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    PassingDeepOrRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    FailingDeepNotRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    PassingDeepNotRuleInlineQuery: String @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])

    FailingAndRuleListQuery: [String] @authz(rules: [FailingAndRule])
    PassingAndRuleListQuery: [String] @authz(rules: [PassingAndRule])
    FailingOrRuleListQuery: [String] @authz(rules: [FailingOrRule])
    PassingOrRuleListQuery: [String] @authz(rules: [PassingOrRule])
    FailingNotRuleListQuery: [String] @authz(rules: [FailingNotRule])
    PassingNotRuleListQuery: [String] @authz(rules: [PassingNotRule])
    FailingDeepAndRuleListQuery: [String] @authz(rules: [FailingDeepAndRule])
    PassingDeepAndRuleListQuery: [String] @authz(rules: [PassingDeepAndRule])
    FailingDeepOrRuleListQuery: [String] @authz(rules: [FailingDeepOrRule])
    PassingDeepOrRuleListQuery: [String] @authz(rules: [PassingDeepOrRule])
    FailingDeepNotRuleListQuery: [String] @authz(rules: [FailingDeepNotRule])
    PassingDeepNotRuleListQuery: [String] @authz(rules: [PassingDeepNotRule])
    FailingAndRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    PassingAndRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    FailingOrRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    PassingOrRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    FailingNotRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    PassingNotRuleInlineListQuery: [String] @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    FailingDeepAndRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    PassingDeepAndRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    FailingDeepOrRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    PassingDeepOrRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    FailingDeepNotRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    PassingDeepNotRuleInlineListQuery: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])
  }
`;

const rawSchemaWithoutDirectives = `
  type Query {
    FailingAndRuleQuery: String
    PassingAndRuleQuery: String
    FailingOrRuleQuery: String
    PassingOrRuleQuery: String
    FailingNotRuleQuery: String
    PassingNotRuleQuery: String
    FailingDeepAndRuleQuery: String
    PassingDeepAndRuleQuery: String
    FailingDeepOrRuleQuery: String
    PassingDeepOrRuleQuery: String
    FailingDeepNotRuleQuery: String
    PassingDeepNotRuleQuery: String

    FailingAndRuleInlineQuery: String
    PassingAndRuleInlineQuery: String
    FailingOrRuleInlineQuery: String
    PassingOrRuleInlineQuery: String
    FailingNotRuleInlineQuery: String
    PassingNotRuleInlineQuery: String
    FailingDeepAndRuleInlineQuery: String
    PassingDeepAndRuleInlineQuery: String
    FailingDeepOrRuleInlineQuery: String
    PassingDeepOrRuleInlineQuery: String
    FailingDeepNotRuleInlineQuery: String
    PassingDeepNotRuleInlineQuery: String

    FailingAndRuleListQuery: [String]
    PassingAndRuleListQuery: [String]
    FailingOrRuleListQuery: [String]
    PassingOrRuleListQuery: [String]
    FailingNotRuleListQuery: [String]
    PassingNotRuleListQuery: [String]
    FailingDeepAndRuleListQuery: [String]
    PassingDeepAndRuleListQuery: [String]
    FailingDeepOrRuleListQuery: [String]
    PassingDeepOrRuleListQuery: [String]
    FailingDeepNotRuleListQuery: [String]
    PassingDeepNotRuleListQuery: [String]
    FailingAndRuleInlineListQuery: [String]
    PassingAndRuleInlineListQuery: [String]
    FailingOrRuleInlineListQuery: [String]
    PassingOrRuleInlineListQuery: [String]
    FailingNotRuleInlineListQuery: [String]
    PassingNotRuleInlineListQuery: [String]
    FailingDeepAndRuleInlineListQuery: [String]
    PassingDeepAndRuleInlineListQuery: [String]
    FailingDeepOrRuleInlineListQuery: [String]
    PassingDeepOrRuleInlineListQuery: [String]
    FailingDeepNotRuleInlineListQuery: [String]
    PassingDeepNotRuleInlineListQuery: [String]
  }
`;

const authSchema = {
  Query: {
    FailingAndRuleQuery: { __authz: { rules: ['FailingAndRule'] } },
    PassingAndRuleQuery: { __authz: { rules: ['PassingAndRule'] } },
    FailingOrRuleQuery: { __authz: { rules: ['FailingOrRule'] } },
    PassingOrRuleQuery: { __authz: { rules: ['PassingOrRule'] } },
    FailingNotRuleQuery: { __authz: { rules: ['FailingNotRule'] } },
    PassingNotRuleQuery: { __authz: { rules: ['PassingNotRule'] } },
    FailingDeepAndRuleQuery: { __authz: { rules: ['FailingDeepAndRule'] } },
    PassingDeepAndRuleQuery: { __authz: { rules: ['PassingDeepAndRule'] } },
    FailingDeepOrRuleQuery: { __authz: { rules: ['FailingDeepOrRule'] } },
    PassingDeepOrRuleQuery: { __authz: { rules: ['PassingDeepOrRule'] } },
    FailingDeepNotRuleQuery: { __authz: { rules: ['FailingDeepNotRule'] } },
    PassingDeepNotRuleQuery: { __authz: { rules: ['PassingDeepNotRule'] } },

    FailingAndRuleInlineQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingAndRuleInlineSchema]
      }
    },
    PassingAndRuleInlineQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingAndRuleInlineSchema]
      }
    },
    FailingOrRuleInlineQuery: {
      __authz: { compositeRules: [inlineSchemaRules.failingOrRuleInlineSchema] }
    },
    PassingOrRuleInlineQuery: {
      __authz: { compositeRules: [inlineSchemaRules.passingOrRuleInlineSchema] }
    },
    FailingNotRuleInlineQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingNotRuleInlineSchema]
      }
    },
    PassingNotRuleInlineQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingNotRuleInlineSchema]
      }
    },
    FailingDeepAndRuleInlineQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepAndRuleInlineSchema]
      }
    },
    PassingDeepAndRuleInlineQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepAndRuleInlineSchema]
      }
    },
    FailingDeepOrRuleInlineQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepOrRuleInlineSchema]
      }
    },
    PassingDeepOrRuleInlineQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepOrRuleInlineSchema]
      }
    },
    FailingDeepNotRuleInlineQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepNotRuleInlineSchema]
      }
    },
    PassingDeepNotRuleInlineQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepNotRuleInlineSchema]
      }
    },

    FailingAndRuleListQuery: { __authz: { rules: ['FailingAndRule'] } },
    PassingAndRuleListQuery: { __authz: { rules: ['PassingAndRule'] } },
    FailingOrRuleListQuery: { __authz: { rules: ['FailingOrRule'] } },
    PassingOrRuleListQuery: { __authz: { rules: ['PassingOrRule'] } },
    FailingNotRuleListQuery: { __authz: { rules: ['FailingNotRule'] } },
    PassingNotRuleListQuery: { __authz: { rules: ['PassingNotRule'] } },
    FailingDeepAndRuleListQuery: { __authz: { rules: ['FailingDeepAndRule'] } },
    PassingDeepAndRuleListQuery: { __authz: { rules: ['PassingDeepAndRule'] } },
    FailingDeepOrRuleListQuery: { __authz: { rules: ['FailingDeepOrRule'] } },
    PassingDeepOrRuleListQuery: { __authz: { rules: ['PassingDeepOrRule'] } },
    FailingDeepNotRuleListQuery: { __authz: { rules: ['FailingDeepNotRule'] } },
    PassingDeepNotRuleListQuery: { __authz: { rules: ['PassingDeepNotRule'] } },

    FailingAndRuleInlineListQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingAndRuleInlineSchema]
      }
    },
    PassingAndRuleInlineListQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingAndRuleInlineSchema]
      }
    },
    FailingOrRuleInlineListQuery: {
      __authz: { compositeRules: [inlineSchemaRules.failingOrRuleInlineSchema] }
    },
    PassingOrRuleInlineListQuery: {
      __authz: { compositeRules: [inlineSchemaRules.passingOrRuleInlineSchema] }
    },
    FailingNotRuleInlineListQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.failingNotRuleInlineSchema]
      }
    },
    PassingNotRuleInlineListQuery: {
      __authz: {
        compositeRules: [inlineSchemaRules.passingNotRuleInlineSchema]
      }
    },
    FailingDeepAndRuleInlineListQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepAndRuleInlineSchema]
      }
    },
    PassingDeepAndRuleInlineListQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepAndRuleInlineSchema]
      }
    },
    FailingDeepOrRuleInlineListQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepOrRuleInlineSchema]
      }
    },
    PassingDeepOrRuleInlineListQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.passingDeepOrRuleInlineSchema]
      }
    },
    FailingDeepNotRuleInlineListQuery: {
      __authz: {
        deepCompositeRules: [inlineSchemaRules.failingDeepNotRuleInlineSchema]
      }
    },
    PassingDeepNotRuleInlineListQuery: {
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
        'FailingAndRule',
        'PassingAndRule',
        'FailingOrRule',
        'PassingOrRule',
        'FailingNotRule',
        'PassingNotRule',
        'FailingDeepAndRule',
        'PassingDeepAndRule',
        'FailingDeepOrRule',
        'PassingDeepOrRule',
        'FailingDeepNotRule',
        'PassingDeepNotRule'
      ])('%s', ruleName => {
        describe.each(['', 'Inline'])('%s', ruleVariant => {
          describe.each(['', 'List'])('%s', resultVariant => {
            it('should fail on failing rules and not fail on passing rules', async () => {
              let result;
              let error;
              try {
                result = await server.executeOperation({
                  query: `query Test {
                      ${ruleName}${ruleVariant}${resultVariant}Query
                    }`
                });
              } catch (e) {
                error = e;
              }

              if (ruleName.startsWith('Failing')) {
                const requestError = error || result?.errors?.[0];
                expect(requestError).toBeDefined();
                expect(requestError.extensions.code).toEqual('FORBIDDEN');
              } else {
                expect(result).toBeDefined();
                const queryResult =
                  result?.data?.[
                    `${ruleName}${ruleVariant}${resultVariant}Query`
                  ];
                expect(
                  typeof (resultVariant === 'List'
                    ? queryResult[0]
                    : queryResult)
                ).toEqual('string');
              }
            });
          });
        });
      });
    });
  });
});
