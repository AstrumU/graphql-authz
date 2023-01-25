import { ApolloServer } from '@apollo/server';
import { FormattedExecutionResult, GraphQLError } from 'graphql';

import { mockServer } from '../mock-server';
import { formatResponse } from '../utils';
import {
  functionalRules,
  inlineRules,
  inlineSchemaRules,
  rules
} from './rules';

const rawSchema = `
  type FailingAndRuleObject @authz(rules: [FailingAndRule]) {
    id: ID!
  }

  type PassingAndRuleObject @authz(rules: [PassingAndRule]) {
    id: ID!
  }

  type FailingOrRuleObject @authz(rules: [FailingOrRule]) {
    id: ID!
  }

  type PassingOrRuleObject @authz(rules: [PassingOrRule]) {
    id: ID!
  }

  type FailingNotRuleObject @authz(rules: [FailingNotRule]) {
    id: ID!
  }

  type PassingNotRuleObject @authz(rules: [PassingNotRule]) {
    id: ID!
  }

  type FailingDeepAndRuleObject @authz(rules: [FailingDeepAndRule]) {
    id: ID!
  }

  type PassingDeepAndRuleObject @authz(rules: [PassingDeepAndRule]) {
    id: ID!
  }

  type FailingDeepOrRuleObject @authz(rules: [FailingDeepOrRule]) {
    id: ID!
  }

  type PassingDeepOrRuleObject @authz(rules: [PassingDeepOrRule]) {
    id: ID!
  }

  type FailingDeepNotRuleObject @authz(rules: [FailingDeepNotRule]) {
    id: ID!
  }

  type PassingDeepNotRuleObject @authz(rules: [PassingDeepNotRule]) {
    id: ID!
  }

  type FailingAndRuleInlineObject @authz(compositeRules: [${inlineRules.failingAndRuleInline}]) {
    id: ID!
  }

  type PassingAndRuleInlineObject @authz(compositeRules: [${inlineRules.passingAndRuleInline}]) {
    id: ID!
  }

  type FailingOrRuleInlineObject @authz(compositeRules: [${inlineRules.failingOrRuleInline}]) {
    id: ID!
  }

  type PassingOrRuleInlineObject @authz(compositeRules: [${inlineRules.passingOrRuleInline}]) {
    id: ID!
  }

  type FailingNotRuleInlineObject @authz(compositeRules: [${inlineRules.failingNotRuleInline}]) {
    id: ID!
  }

  type PassingNotRuleInlineObject @authz(compositeRules: [${inlineRules.passingNotRuleInline}]) {
    id: ID!
  }

  type FailingDeepAndRuleInlineObject @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}]) {
    id: ID!
  }

  type PassingDeepAndRuleInlineObject @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}]) {
    id: ID!
  }

  type FailingDeepOrRuleInlineObject @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}]) {
    id: ID!
  }

  type PassingDeepOrRuleInlineObject @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}]) {
    id: ID!
  }

  type FailingDeepNotRuleInlineObject @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}]) {
    id: ID!
  }

  type PassingDeepNotRuleInlineObject @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}]) {
    id: ID!
  }

  type Query {
    FailingAndRuleQuery: FailingAndRuleObject
    PassingAndRuleQuery: PassingAndRuleObject
    FailingOrRuleQuery: FailingOrRuleObject
    PassingOrRuleQuery: PassingOrRuleObject
    FailingNotRuleQuery: FailingNotRuleObject
    PassingNotRuleQuery: PassingNotRuleObject
    FailingDeepAndRuleQuery: FailingDeepAndRuleObject
    PassingDeepAndRuleQuery: PassingDeepAndRuleObject
    FailingDeepOrRuleQuery: FailingDeepOrRuleObject
    PassingDeepOrRuleQuery: PassingDeepOrRuleObject
    FailingDeepNotRuleQuery: FailingDeepNotRuleObject
    PassingDeepNotRuleQuery: PassingDeepNotRuleObject

    FailingAndRuleInlineQuery: FailingAndRuleInlineObject
    PassingAndRuleInlineQuery: PassingAndRuleInlineObject
    FailingOrRuleInlineQuery: FailingOrRuleInlineObject
    PassingOrRuleInlineQuery: PassingOrRuleInlineObject
    FailingNotRuleInlineQuery: FailingNotRuleInlineObject
    PassingNotRuleInlineQuery: PassingNotRuleInlineObject
    FailingDeepAndRuleInlineQuery: FailingDeepAndRuleInlineObject
    PassingDeepAndRuleInlineQuery: PassingDeepAndRuleInlineObject
    FailingDeepOrRuleInlineQuery: FailingDeepOrRuleInlineObject
    PassingDeepOrRuleInlineQuery: PassingDeepOrRuleInlineObject
    FailingDeepNotRuleInlineQuery: FailingDeepNotRuleInlineObject
    PassingDeepNotRuleInlineQuery: PassingDeepNotRuleInlineObject

    FailingAndRuleListQuery: [FailingAndRuleObject]
    PassingAndRuleListQuery: [PassingAndRuleObject]
    FailingOrRuleListQuery: [FailingOrRuleObject]
    PassingOrRuleListQuery: [PassingOrRuleObject]
    FailingNotRuleListQuery: [FailingNotRuleObject]
    PassingNotRuleListQuery: [PassingNotRuleObject]
    FailingDeepAndRuleListQuery: [FailingDeepAndRuleObject]
    PassingDeepAndRuleListQuery: [PassingDeepAndRuleObject]
    FailingDeepOrRuleListQuery: [FailingDeepOrRuleObject]
    PassingDeepOrRuleListQuery: [PassingDeepOrRuleObject]
    FailingDeepNotRuleListQuery: [FailingDeepNotRuleObject]
    PassingDeepNotRuleListQuery: [PassingDeepNotRuleObject]

    FailingAndRuleInlineListQuery: [FailingAndRuleInlineObject]
    PassingAndRuleInlineListQuery: [PassingAndRuleInlineObject]
    FailingOrRuleInlineListQuery: [FailingOrRuleInlineObject]
    PassingOrRuleInlineListQuery: [PassingOrRuleInlineObject]
    FailingNotRuleInlineListQuery: [FailingNotRuleInlineObject]
    PassingNotRuleInlineListQuery: [PassingNotRuleInlineObject]
    FailingDeepAndRuleInlineListQuery: [FailingDeepAndRuleInlineObject]
    PassingDeepAndRuleInlineListQuery: [PassingDeepAndRuleInlineObject]
    FailingDeepOrRuleInlineListQuery: [FailingDeepOrRuleInlineObject]
    PassingDeepOrRuleInlineListQuery: [PassingDeepOrRuleInlineObject]
    FailingDeepNotRuleInlineListQuery: [FailingDeepNotRuleInlineObject]
    PassingDeepNotRuleInlineListQuery: [PassingDeepNotRuleInlineObject]
  }
`;

const rawSchemaWithoutDirectives = `
  type FailingAndRuleObject {
    id: ID!
  }

  type PassingAndRuleObject {
    id: ID!
  }

  type FailingOrRuleObject {
    id: ID!
  }

  type PassingOrRuleObject  {
    id: ID!
  }

  type FailingNotRuleObject  {
    id: ID!
  }

  type PassingNotRuleObject  {
    id: ID!
  }

  type FailingDeepAndRuleObject  {
    id: ID!
  }

  type PassingDeepAndRuleObject  {
    id: ID!
  }

  type FailingDeepOrRuleObject  {
    id: ID!
  }

  type PassingDeepOrRuleObject  {
    id: ID!
  }

  type FailingDeepNotRuleObject {
    id: ID!
  }

  type PassingDeepNotRuleObject {
    id: ID!
  }

  type FailingAndRuleInlineObject {
    id: ID!
  }

  type PassingAndRuleInlineObject {
    id: ID!
  }

  type FailingOrRuleInlineObject {
    id: ID!
  }

  type PassingOrRuleInlineObject {
    id: ID!
  }

  type FailingNotRuleInlineObject {
    id: ID!
  }

  type PassingNotRuleInlineObject {
    id: ID!
  }

  type FailingDeepAndRuleInlineObject {
    id: ID!
  }

  type PassingDeepAndRuleInlineObject {
    id: ID!
  }

  type FailingDeepOrRuleInlineObject {
    id: ID!
  }

  type PassingDeepOrRuleInlineObject {
    id: ID!
  }

  type FailingDeepNotRuleInlineObject {
    id: ID!
  }

  type PassingDeepNotRuleInlineObject {
    id: ID!
  }

  type Query {
    FailingAndRuleQuery: FailingAndRuleObject
    PassingAndRuleQuery: PassingAndRuleObject
    FailingOrRuleQuery: FailingOrRuleObject
    PassingOrRuleQuery: PassingOrRuleObject
    FailingNotRuleQuery: FailingNotRuleObject
    PassingNotRuleQuery: PassingNotRuleObject
    FailingDeepAndRuleQuery: FailingDeepAndRuleObject
    PassingDeepAndRuleQuery: PassingDeepAndRuleObject
    FailingDeepOrRuleQuery: FailingDeepOrRuleObject
    PassingDeepOrRuleQuery: PassingDeepOrRuleObject
    FailingDeepNotRuleQuery: FailingDeepNotRuleObject
    PassingDeepNotRuleQuery: PassingDeepNotRuleObject

    FailingAndRuleInlineQuery: FailingAndRuleInlineObject
    PassingAndRuleInlineQuery: PassingAndRuleInlineObject
    FailingOrRuleInlineQuery: FailingOrRuleInlineObject
    PassingOrRuleInlineQuery: PassingOrRuleInlineObject
    FailingNotRuleInlineQuery: FailingNotRuleInlineObject
    PassingNotRuleInlineQuery: PassingNotRuleInlineObject
    FailingDeepAndRuleInlineQuery: FailingDeepAndRuleInlineObject
    PassingDeepAndRuleInlineQuery: PassingDeepAndRuleInlineObject
    FailingDeepOrRuleInlineQuery: FailingDeepOrRuleInlineObject
    PassingDeepOrRuleInlineQuery: PassingDeepOrRuleInlineObject
    FailingDeepNotRuleInlineQuery: FailingDeepNotRuleInlineObject
    PassingDeepNotRuleInlineQuery: PassingDeepNotRuleInlineObject

    FailingAndRuleListQuery: [FailingAndRuleObject]
    PassingAndRuleListQuery: [PassingAndRuleObject]
    FailingOrRuleListQuery: [FailingOrRuleObject]
    PassingOrRuleListQuery: [PassingOrRuleObject]
    FailingNotRuleListQuery: [FailingNotRuleObject]
    PassingNotRuleListQuery: [PassingNotRuleObject]
    FailingDeepAndRuleListQuery: [FailingDeepAndRuleObject]
    PassingDeepAndRuleListQuery: [PassingDeepAndRuleObject]
    FailingDeepOrRuleListQuery: [FailingDeepOrRuleObject]
    PassingDeepOrRuleListQuery: [PassingDeepOrRuleObject]
    FailingDeepNotRuleListQuery: [FailingDeepNotRuleObject]
    PassingDeepNotRuleListQuery: [PassingDeepNotRuleObject]

    FailingAndRuleInlineListQuery: [FailingAndRuleInlineObject]
    PassingAndRuleInlineListQuery: [PassingAndRuleInlineObject]
    FailingOrRuleInlineListQuery: [FailingOrRuleInlineObject]
    PassingOrRuleInlineListQuery: [PassingOrRuleInlineObject]
    FailingNotRuleInlineListQuery: [FailingNotRuleInlineObject]
    PassingNotRuleInlineListQuery: [PassingNotRuleInlineObject]
    FailingDeepAndRuleInlineListQuery: [FailingDeepAndRuleInlineObject]
    PassingDeepAndRuleInlineListQuery: [PassingDeepAndRuleInlineObject]
    FailingDeepOrRuleInlineListQuery: [FailingDeepOrRuleInlineObject]
    PassingDeepOrRuleInlineListQuery: [PassingDeepOrRuleInlineObject]
    FailingDeepNotRuleInlineListQuery: [FailingDeepNotRuleInlineObject]
    PassingDeepNotRuleInlineListQuery: [PassingDeepNotRuleInlineObject]
  }
`;

const authSchema = {
  FailingAndRuleObject: { __authz: { rules: ['FailingAndRule'] } },
  PassingAndRuleObject: { __authz: { rules: ['PassingAndRule'] } },
  FailingOrRuleObject: { __authz: { rules: ['FailingOrRule'] } },
  PassingOrRuleObject: { __authz: { rules: ['PassingOrRule'] } },
  FailingNotRuleObject: { __authz: { rules: ['FailingNotRule'] } },
  PassingNotRuleObject: { __authz: { rules: ['PassingNotRule'] } },
  FailingDeepAndRuleObject: { __authz: { rules: ['FailingDeepAndRule'] } },
  PassingDeepAndRuleObject: { __authz: { rules: ['PassingDeepAndRule'] } },
  FailingDeepOrRuleObject: { __authz: { rules: ['FailingDeepOrRule'] } },
  PassingDeepOrRuleObject: { __authz: { rules: ['PassingDeepOrRule'] } },
  FailingDeepNotRuleObject: { __authz: { rules: ['FailingDeepNotRule'] } },
  PassingDeepNotRuleObject: { __authz: { rules: ['PassingDeepNotRule'] } },

  FailingAndRuleInlineObject: {
    __authz: { compositeRules: [inlineSchemaRules.failingAndRuleInlineSchema] }
  },
  PassingAndRuleInlineObject: {
    __authz: { compositeRules: [inlineSchemaRules.passingAndRuleInlineSchema] }
  },
  FailingOrRuleInlineObject: {
    __authz: { compositeRules: [inlineSchemaRules.failingOrRuleInlineSchema] }
  },
  PassingOrRuleInlineObject: {
    __authz: { compositeRules: [inlineSchemaRules.passingOrRuleInlineSchema] }
  },
  FailingNotRuleInlineObject: {
    __authz: { compositeRules: [inlineSchemaRules.failingNotRuleInlineSchema] }
  },
  PassingNotRuleInlineObject: {
    __authz: { compositeRules: [inlineSchemaRules.passingNotRuleInlineSchema] }
  },
  FailingDeepAndRuleInlineObject: {
    __authz: {
      deepCompositeRules: [inlineSchemaRules.failingDeepAndRuleInlineSchema]
    }
  },
  PassingDeepAndRuleInlineObject: {
    __authz: {
      deepCompositeRules: [inlineSchemaRules.passingDeepAndRuleInlineSchema]
    }
  },
  FailingDeepOrRuleInlineObject: {
    __authz: {
      deepCompositeRules: [inlineSchemaRules.failingDeepOrRuleInlineSchema]
    }
  },
  PassingDeepOrRuleInlineObject: {
    __authz: {
      deepCompositeRules: [inlineSchemaRules.passingDeepOrRuleInlineSchema]
    }
  },
  FailingDeepNotRuleInlineObject: {
    __authz: {
      deepCompositeRules: [inlineSchemaRules.failingDeepNotRuleInlineSchema]
    }
  },
  PassingDeepNotRuleInlineObject: {
    __authz: {
      deepCompositeRules: [inlineSchemaRules.passingDeepNotRuleInlineSchema]
    }
  }
};

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe.each(['directive', 'authSchema'] as const)(
      '%s',
      declarationMode => {
        describe.each([
          ['', rules],
          ['functional', functionalRules]
        ])('%s', (name, rules) => {
          describe('Composite rules', () => {
            let server: ApolloServer;

            beforeAll(() => {
              server = mockServer({
                integrationMode,
                rules,
                rawSchema,
                rawSchemaWithoutDirectives,
                declarationMode,
                authSchema
              });
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
                    let result: FormattedExecutionResult | undefined =
                      undefined;
                    let error: GraphQLError | undefined = undefined;
                    try {
                      result = formatResponse(
                        await server.executeOperation({
                          query: `query Test {
                            ${ruleName}${ruleVariant}${resultVariant}Query {
                              __typename
                              id
                            }
                          }`
                        })
                      );
                    } catch (e) {
                      error = e as GraphQLError;
                    }

                    if (ruleName.startsWith('Failing')) {
                      const requestError = error || result?.errors?.[0];
                      expect(requestError).toBeDefined();
                      expect(requestError?.extensions?.code).toEqual(
                        'FORBIDDEN'
                      );
                    } else {
                      expect(result).toBeDefined();
                      const queryResult: any =
                        result?.data?.[
                          `${ruleName}${ruleVariant}${resultVariant}Query`
                        ];
                      expect(
                        resultVariant === 'List' ? queryResult[0] : queryResult
                      ).toHaveProperty('id');

                      expect(
                        typeof (
                          resultVariant === 'List'
                            ? queryResult[0]
                            : queryResult
                        ).id
                      ).toEqual('string');

                      expect(
                        (resultVariant === 'List'
                          ? queryResult[0]
                          : queryResult
                        ).__typename
                      ).toEqual(`${ruleName}${ruleVariant}Object`);
                    }
                  });
                });
              });
            });
          });
        });
      }
    );
  }
);
